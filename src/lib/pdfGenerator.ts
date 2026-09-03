import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JournalEntry, User, ClassAnalysisSummary, HabitKategoriLevel, SchoolSettings } from '../types';
import { HABIT_DEFINITIONS, KATEGORI_CONFIG, DEFAULT_SCHOOL_SETTINGS } from './constants';

export class PDFReportGenerator {
  /**
   * Helper to retrieve assigned teacher name and NIP for a specific class from stored users
   */
  public static getTeacherForClass(className?: string, usersList?: User[]): { name: string; nip?: string } | undefined {
    try {
      let users: User[] = usersList || [];
      if (!users || users.length === 0) {
        const savedUsers = localStorage.getItem('7kaih_users_v1');
        if (savedUsers) {
          users = JSON.parse(savedUsers) as User[];
        }
      }

      if (users && users.length > 0 && className) {
        const rawClass = className.trim();
        const classNumMatch = rawClass.match(/([7-9]|vii|viii|ix)\s*([a-z])/i);
        let normalizedCode = '';
        if (classNumMatch) {
          let num = classNumMatch[1].toLowerCase();
          if (num === 'vii') num = '7';
          if (num === 'viii') num = '8';
          if (num === 'ix') num = '9';
          normalizedCode = `${num}${classNumMatch[2].toLowerCase()}`;
        } else {
          normalizedCode = rawClass.toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        // 1. Direct match by assignedClassIds or className
        const teacher = users.find(u => {
          if (u.role !== 'walikelas') return false;
          
          if (u.assignedClassIds && u.assignedClassIds.some(cid => {
            const cleanCid = cid.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanCid.includes(normalizedCode) || normalizedCode.includes(cleanCid);
          })) {
            return true;
          }

          if (u.className) {
            const tClass = u.className.toLowerCase().replace(/[^a-z0-9]/g, '');
            return tClass.includes(normalizedCode) || normalizedCode.includes(tClass);
          }
          return false;
        });

        if (teacher) {
          return { name: teacher.name, nip: teacher.nip };
        }

        // 2. Fallback: Any registered walikelas
        const anyWali = users.find(u => u.role === 'walikelas');
        if (anyWali) {
          return { name: anyWali.name, nip: anyWali.nip };
        }
      }
    } catch (e) {
      console.warn('PDF generator teacher lookup fallback:', e);
    }
    return undefined;
  }

  /**
   * Helper to retrieve current active school settings from localStorage or fallback
   */
  public static getActiveSchoolSettings(): SchoolSettings {
    try {
      const saved = localStorage.getItem('7kaih_school_settings_v1');
      if (saved) {
        return { ...DEFAULT_SCHOOL_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('PDF generator school settings fallback:', e);
    }
    return DEFAULT_SCHOOL_SETTINGS;
  }

  /**
   * Draw formal official Indonesian Kop Surat with customizable school config
   */
  private static drawFormalKopSurat(doc: jsPDF, isLandscape: boolean = false, customConfig?: SchoolSettings): number {
    const config = customConfig || this.getActiveSchoolSettings();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setTextColor(20, 20, 20);

    // Line 1: Pemerintah Kabupaten / Provinsi
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(config.government.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

    // Line 2: Dinas Pendidikan
    doc.setFontSize(10.5);
    doc.text(config.department.toUpperCase(), pageWidth / 2, 17, { align: 'center' });

    // Line 3: Nama Sekolah (Standout Bold)
    doc.setFontSize(13.5);
    doc.text(config.fullName.toUpperCase(), pageWidth / 2, 23, { align: 'center' });

    // Line 4: Alamat & Kontak
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `Alamat : ${config.address}`,
      pageWidth / 2,
      28,
      { align: 'center' }
    );
    doc.setFontSize(8);
    doc.text(
      `Telp : ${config.phone}  |  Email : ${config.email}  |  Website : ${config.website}`,
      pageWidth / 2,
      32,
      { align: 'center' }
    );

    // Double Border Divider (Garis Ganda Kop Surat)
    const lineY = 35;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, lineY, pageWidth - margin, lineY);
    doc.setLineWidth(0.25);
    doc.line(margin, lineY + 0.9, pageWidth - margin, lineY + 0.9);

    return lineY + 5; // Return next Y position
  }

  /**
   * Export individual student monthly development report with formal Kop Surat
   */
  static generateStudentReport(
    student: User,
    entries: JournalEntry[],
    monthName: string,
    teacherFeedbackGlobal?: string,
    customConfig?: SchoolSettings,
    teacherInfo?: { name: string; nip?: string }
  ) {
    const config = customConfig || this.getActiveSchoolSettings();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // 1. Official Kop Surat
    const startY = this.drawFormalKopSurat(doc, false, config);

    // 2. Report Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('LAPORAN HASIL PEMANTAUAN 7 KEBIASAAN ANAK INDONESIA HEBAT (7 KAIH)', pageWidth / 2, startY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Tahun Ajaran ${config.academicYear} (Semester ${config.semester}) • Periode: ${monthName}`, pageWidth / 2, startY + 9, { align: 'center' });

    // 3. Student Identity Box
    const infoY = startY + 12;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, infoY, pageWidth - 2 * margin, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.text('Nama Siswa', margin + 4, infoY + 6);
    doc.text('NIS', margin + 4, infoY + 12);
    doc.text('Kelas / No Absen', margin + 4, infoY + 18);

    const displayAbsen = student.attendanceNumber || student.noAbsen ? `No. ${student.attendanceNumber || student.noAbsen}` : '-';

    doc.setFont('helvetica', 'normal');
    doc.text(`: ${student.name}`, margin + 36, infoY + 6);
    doc.text(`: ${student.nis || student.nisn || '-'}`, margin + 36, infoY + 12);
    doc.text(`: ${student.className || '7A'} / ${displayAbsen}`, margin + 36, infoY + 18);

    doc.setFont('helvetica', 'bold');
    doc.text('Bulan Pemantauan', margin + 104, infoY + 6);
    doc.text('Total Jurnal Terisi', margin + 104, infoY + 12);
    doc.text('Tingkat Keterbiasaan', margin + 104, infoY + 18);

    const totalDays = entries.length;
    const avgScore = totalDays > 0 
      ? Math.round(entries.reduce((acc, curr) => acc + curr.overallScore, 0) / totalDays)
      : 0;

    let kategori: HabitKategoriLevel = 'belum_terbiasa';
    if (avgScore >= 80) kategori = 'sudah_terbiasa';
    else if (avgScore >= 50) kategori = 'mulai_terbiasa';

    doc.setFont('helvetica', 'normal');
    doc.text(`: ${monthName}`, margin + 144, infoY + 6);
    doc.text(`: ${totalDays} Hari (${avgScore}% Kepatuhan)`, margin + 144, infoY + 12);

    doc.setFont('helvetica', 'bold');
    if (kategori === 'sudah_terbiasa') {
      doc.setTextColor(16, 185, 129); // green
    } else if (kategori === 'mulai_terbiasa') {
      doc.setTextColor(217, 119, 6); // amber
    } else {
      doc.setTextColor(225, 29, 72); // rose
    }

    // Split text so if Tingkat Keterbiasaan is long, it wraps cleanly onto the next line
    const kategoriTextLines = doc.splitTextToSize(`: ${KATEGORI_CONFIG[kategori].label.toUpperCase()}`, 38);
    kategoriTextLines.forEach((line: string, idx: number) => {
      doc.text(line, margin + 144, infoY + 18 + (idx * 4));
    });

    doc.setTextColor(30, 41, 59);

    // 4. Rekapitulasi 7 Kebiasaan Table (Exact matching format from user reference)
    const tableTitleY = infoY + 32;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('I. Rekapitulasi Pelaksanaan 7 Pilar Kebiasaan', margin, tableTitleY);

    const habitRows = Object.keys(HABIT_DEFINITIONS).map((habitId, idx) => {
      const def = HABIT_DEFINITIONS[habitId as keyof typeof HABIT_DEFINITIONS];
      const completedTimes = entries.filter(e => e.habits[habitId as keyof typeof HABIT_DEFINITIONS]?.completed).length;
      const rate = totalDays > 0 ? Math.round((completedTimes / totalDays) * 100) : 0;
      
      let habitStatus = 'Belum Konsisten';
      if (rate >= 80) habitStatus = 'Sangat Baik (Konsisten)';
      else if (rate >= 50) habitStatus = 'Cukup Baik (Berkembang)';

      return [
        (idx + 1).toString(),
        def.shortName || def.title,
        def.tagline,
        `${completedTimes} / ${totalDays || 1} hari`,
        `${rate}%`,
        habitStatus
      ];
    });

    autoTable(doc, {
      startY: tableTitleY + 3,
      head: [['No', 'Pilar Kebiasaan', 'Tujuan / Indikator', 'Keterisian', 'Kepatuhan', 'Status Analisis']],
      body: habitRows,
      theme: 'grid',
      headStyles: {
        fillColor: [26, 68, 148], // Dark Blue as shown in the reference image
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        overflow: 'linebreak',
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 30 },
        2: { cellWidth: 62 },
        3: { halign: 'center', cellWidth: 24 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
        5: { fontStyle: 'bold', cellWidth: 40, overflow: 'linebreak' }
      },
      margin: { left: margin, right: margin },
      tableWidth: 182
    });

    // 5. Catatan Wali Kelas & Evaluasi Ortu
    let currentY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('II. Catatan Evaluasi & Bimbingan Wali Kelas', margin, currentY);

    currentY += 3;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 20, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const noteText = teacherFeedbackGlobal || 
      `Ananda ${student.name} menunjukkan perkembangan karakter yang ${KATEGORI_CONFIG[kategori].label.toLowerCase()} di SMP Negeri 2 Kasihan. Tetap istiqomah dalam beribadah, bangun pagi, dan aktif membaca buku di rumah. Terima kasih kepada Orang Tua atas konfirmasi dan pendampingan di rumah.`;
    
    doc.text(doc.splitTextToSize(noteText, pageWidth - 2 * margin - 8), margin + 4, currentY + 5);

    currentY += 24;

    // 6. Signatures Box (Siswa, Orang Tua, Wali Kelas, Kepala Sekolah)
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${config.regency}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 50, currentY);

    currentY += 5;
    const colW = (pageWidth - 2 * margin) / 3;

    // Column 1: Siswa
    doc.text('Siswa / Murid,', margin + (colW / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(student.name, margin + (colW / 2), currentY + 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIS. ${student.nis || student.nisn || '-'}`, margin + (colW / 2), currentY + 22, { align: 'center' });

    // Column 2: Orang Tua
    doc.text('Orang Tua / Wali Murid,', margin + colW + (colW / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('( ................................... )', margin + colW + (colW / 2), currentY + 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Tanda Tangan & Nama Terang', margin + colW + (colW / 2), currentY + 22, { align: 'center' });

    // Column 3: Wali Kelas
    const lookupTeacher = this.getTeacherForClass(student.className);
    const displayTeacherName = teacherInfo?.name || lookupTeacher?.name || (student.className ? `Wali Kelas ${student.className}` : 'Wali Kelas');
    const displayTeacherNip = teacherInfo?.nip 
      ? `NIP. ${teacherInfo.nip}` 
      : (lookupTeacher?.nip ? `NIP. ${lookupTeacher.nip}` : 'NIP. -');

    doc.text('Wali Kelas,', margin + 2 * colW + (colW / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(displayTeacherName, margin + 2 * colW + (colW / 2), currentY + 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(displayTeacherNip, margin + 2 * colW + (colW / 2), currentY + 22, { align: 'center' });

    // Bottom Center: Mengetahui Kepala Sekolah (Digeser 2 baris ke bawah agar longgar & rapi)
    currentY += 35;
    if (currentY + 25 < doc.internal.pageSize.getHeight()) {
      doc.text('Mengetahui,', pageWidth / 2, currentY, { align: 'center' });
      doc.text(`Kepala ${config.name}`, pageWidth / 2, currentY + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(config.principalName, pageWidth / 2, currentY + 19, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`NIP. ${config.principalNip}`, pageWidth / 2, currentY + 23, { align: 'center' });
    }

    // Save File
    const filename = `Laporan_7KAIH_${student.name.replace(/\s+/g, '_')}_${monthName}.pdf`;
    doc.save(filename);
  }

  /**
   * Export detailed daily implementation logs (Log Harian / Matriks 7 KAIH) for a student with formal Kop Surat
   */
  static generateStudentDetailedReport(
    student: User,
    entries: JournalEntry[],
    monthName: string,
    customTeacherNote?: string,
    customConfig?: SchoolSettings,
    teacherInfo?: { name: string; nip?: string }
  ) {
    const config = customConfig || this.getActiveSchoolSettings();
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich 7 habits daily matrix
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // 1. Official Kop Surat
    const startY = this.drawFormalKopSurat(doc, true, config);

    // 2. Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('LEMBAR DETAIL PELAKSANAAN 7 KEBIASAAN ANAK INDONESIA HEBAT (7 KAIH)', pageWidth / 2, startY + 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Catatan & Verifikasi Log Harian Pembiasaan Siswa • Periode: ${monthName} • TA ${config.academicYear} (${config.semester})`, pageWidth / 2, startY + 7.5, { align: 'center' });

    // 3. Student Identity Box
    const infoY = startY + 10;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, infoY, pageWidth - 2 * margin, 18, 2, 2, 'FD');

    const totalDays = entries.length;
    const avgScore = totalDays > 0 
      ? Math.round(entries.reduce((acc, curr) => acc + curr.overallScore, 0) / totalDays)
      : 0;

    let kategori: HabitKategoriLevel = 'belum_terbiasa';
    if (avgScore >= 80) kategori = 'sudah_terbiasa';
    else if (avgScore >= 50) kategori = 'mulai_terbiasa';

    const displayAbsen = student.attendanceNumber || student.noAbsen ? `No. ${student.attendanceNumber || student.noAbsen}` : '-';

    // Left Column
    doc.setFont('helvetica', 'bold');
    doc.text('Nama Siswa', margin + 4, infoY + 5);
    doc.text('NIS / Agama', margin + 4, infoY + 10);
    doc.text('Kelas / Absen', margin + 4, infoY + 15);

    doc.setFont('helvetica', 'normal');
    doc.text(`: ${student.name}`, margin + 30, infoY + 5);
    doc.text(`: ${student.nis || student.nisn || '-'}  /  ${student.religion || 'Islam'}`, margin + 30, infoY + 10);
    doc.text(`: ${student.className || '7A'}  /  ${displayAbsen}`, margin + 30, infoY + 15);

    // Middle Column
    const col2X = margin + 110;
    doc.setFont('helvetica', 'bold');
    doc.text('Bulan Pemantauan', col2X, infoY + 5);
    doc.text('Total Jurnal Terisi', col2X, infoY + 10);
    doc.text('Tingkat Kepatuhan', col2X, infoY + 15);

    doc.setFont('helvetica', 'normal');
    doc.text(`: ${monthName}`, col2X + 32, infoY + 5);
    doc.text(`: ${totalDays} Hari Aktif`, col2X + 32, infoY + 10);
    doc.text(`: ${avgScore}% (${KATEGORI_CONFIG[kategori].label})`, col2X + 32, infoY + 15);

    // Right Column: Wali Kelas
    const lookupTeacher = this.getTeacherForClass(student.className);
    const displayTeacherName = teacherInfo?.name || lookupTeacher?.name || (student.className ? `Wali Kelas ${student.className}` : 'Wali Kelas');
    const displayTeacherNip = teacherInfo?.nip 
      ? `NIP. ${teacherInfo.nip}` 
      : (lookupTeacher?.nip ? `NIP. ${lookupTeacher.nip}` : 'NIP. -');

    const col3X = margin + 195;
    doc.setFont('helvetica', 'bold');
    doc.text('Wali Kelas', col3X, infoY + 5);
    doc.text('NIP Guru', col3X, infoY + 10);
    doc.text('Status Validasi', col3X, infoY + 15);

    const validCount = entries.filter(e => e.parentValidation?.status === 'valid' || e.parentValidation?.validated).length;
    const validRate = totalDays > 0 ? Math.round((validCount / totalDays) * 100) : 0;

    doc.setFont('helvetica', 'normal');
    doc.text(`: ${displayTeacherName}`, col3X + 26, infoY + 5);
    doc.text(`: ${displayTeacherNip}`, col3X + 26, infoY + 10);
    doc.text(`: ${validCount}/${totalDays} Hari (${validRate}% Tervalidasi)`, col3X + 26, infoY + 15);

    // 4. Sort entries by date ascending
    const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    // 5. Daily Details Table (11 Columns)
    const tableBody = sortedEntries.map((j, idx) => {
      // Date formatting: DD/MM (Hari)
      let dateLabel = j.date;
      try {
        const dObj = new Date(j.date);
        const dayName = dObj.toLocaleDateString('id-ID', { weekday: 'short' });
        const dateNum = j.date.split('-')[2] || j.date;
        dateLabel = `${dateNum} (${dayName})`;
      } catch (e) {
        dateLabel = j.date;
      }

      // 1. Bangun Pagi
      const bp = j.habits?.bangun_pagi;
      const bpText = bp?.completed 
        ? `✓ ${bp.values?.wake_time || bp.time || '04:30'}` 
        : '✗ Belum';

      // 2. Beribadah
      const ib = j.habits?.ibadah;
      let ibDetails: string[] = [];
      if (ib?.values?.prayer_five_times) ibDetails.push('5 Waktu');
      if (ib?.values?.quran_reading) ibDetails.push('Tadarus');
      if (ib?.values?.night_prayer) ibDetails.push('Tahajud');
      if (ib?.values?.duha_prayer) ibDetails.push('Dhuha');
      const ibText = ib?.completed 
        ? `✓ ${ibDetails.length > 0 ? ibDetails.join(', ') : 'Terlaksana'}`
        : '✗ Belum';

      // 3. Berolahraga
      const ol = j.habits?.olahraga;
      const olText = ol?.completed 
        ? `✓ ${ol.values?.exercise_type || 'Senam'} (${ol.values?.duration || 20}m)`
        : '✗ -';

      // 4. Makan Sehat
      const ms = j.habits?.makan_sehat;
      let msItems: string[] = [];
      if (ms?.values?.breakfast) msItems.push('Sarapan');
      if (ms?.values?.water_glasses) msItems.push(`${ms.values.water_glasses}gls`);
      const msText = ms?.completed 
        ? `✓ ${msItems.length > 0 ? msItems.join(', ') : 'Bergizi'}`
        : '✗ -';

      // 5. Gemar Membaca
      const mb = j.habits?.membaca;
      const mbText = mb?.completed 
        ? `✓ ${mb.values?.book_title ? (mb.values.book_title.length > 18 ? mb.values.book_title.substring(0, 16) + '..' : mb.values.book_title) : 'Literasi'}${mb.values?.pages_read ? ` (${mb.values.pages_read}hlm)` : ''}`
        : '✗ -';

      // 6. Bermasyarakat
      const bm = j.habits?.bermasyarakat;
      const bmText = bm?.completed 
        ? `✓ ${bm.values?.activity_type ? (bm.values.activity_type.length > 18 ? bm.values.activity_type.substring(0, 16) + '..' : bm.values.activity_type) : (bm.values?.social_action ? bm.values.social_action.substring(0, 16) : 'Bantu Ortu')}`
        : '✗ -';

      // 7. Istirahat Cepat
      const ist = j.habits?.istirahat;
      const istText = ist?.completed 
        ? `✓ ${ist.values?.sleep_time || '21:00'}`
        : '✗ Belum';

      // Score
      const scoreText = `${j.overallScore}% (${j.completedCount || Object.values(j.habits || {}).filter(h => h?.completed).length}/7)`;

      // Parent Validation
      const isVal = j.parentValidation?.status === 'valid' || j.parentValidation?.validated;
      const valText = isVal ? '✓ Valid' : j.parentValidation?.status === 'invalid' ? '✗ Tidak Sesuai' : '⏳ Menunggu';

      return [
        (idx + 1).toString(),
        dateLabel,
        bpText,
        ibText,
        olText,
        msText,
        mbText,
        bmText,
        istText,
        scoreText,
        valText
      ];
    });

    if (tableBody.length === 0) {
      tableBody.push([
        '-',
        monthName,
        'Belum ada log',
        'Belum ada log',
        'Belum ada log',
        'Belum ada log',
        'Belum ada log',
        'Belum ada log',
        'Belum ada log',
        '0%',
        'Belum terisi'
      ]);
    }

    autoTable(doc, {
      startY: infoY + 21,
      head: [[
        'No',
        'Tgl (Hari)',
        '1. Bangun Pagi',
        '2. Beribadah',
        '3. Berolahraga',
        '4. Makan Sehat',
        '5. Gemar Membaca',
        '6. Bermasyarakat',
        '7. Tidur Cepat',
        'Skor KAIH',
        'Validasi Ortu'
      ]],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [26, 68, 148], // Dark Blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        cellPadding: 1.5
      },
      styles: {
        fontSize: 6.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 17 },
        2: { cellWidth: 24 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
        5: { cellWidth: 26 },
        6: { cellWidth: 32 },
        7: { cellWidth: 32 },
        8: { cellWidth: 22 },
        9: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        10: { halign: 'center', fontStyle: 'bold', cellWidth: 22 }
      },
      margin: { left: margin, right: margin }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 5;

    // Check if we need a new page for notes & signatures
    if (currentY + 45 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      currentY = 18;
    }

    // Catatan Tambahan Guru / Rekomendasi
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan Evaluasi & Rekomendasi Pembiasaan:', margin, currentY);

    currentY += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 14, 1.5, 1.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const noteText = customTeacherNote || 
      `Ananda ${student.name} telah melaksanakan jurnal 7 KAIH selama ${totalDays} hari pada periode ${monthName} dengan rerata ${avgScore}%. Orang tua dan wali kelas diharapkan terus bersinergi dalam membimbing konsistensi pembiasaan beribadah, literasi membaca, dan istirahat tepat waktu.`;
    doc.text(doc.splitTextToSize(noteText, pageWidth - 2 * margin - 6), margin + 3, currentY + 4.5);

    currentY += 18;

    // Signatures 4 Kolom: Siswa, Orang Tua, Wali Kelas, Kepala Sekolah
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${config.regency}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 50, currentY);

    currentY += 4;
    const colW = (pageWidth - 2 * margin) / 4;

    // 1. Siswa
    doc.text('Siswa / Murid,', margin + (colW / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(student.name, margin + (colW / 2), currentY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIS. ${student.nis || student.nisn || '-'}`, margin + (colW / 2), currentY + 17.5, { align: 'center' });

    // 2. Orang Tua
    doc.text('Orang Tua / Wali Murid,', margin + colW + (colW / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('( ................................... )', margin + colW + (colW / 2), currentY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Tanda Tangan & Nama Terang', margin + colW + (colW / 2), currentY + 17.5, { align: 'center' });

    // 3. Wali Kelas
    doc.text('Wali Kelas,', margin + 2 * colW + (colW / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(displayTeacherName, margin + 2 * colW + (colW / 2), currentY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(displayTeacherNip, margin + 2 * colW + (colW / 2), currentY + 17.5, { align: 'center' });

    // 4. Kepala Sekolah
    doc.text(`Mengetahui Kepala Sekolah,`, margin + 3 * colW + (colW / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(config.principalName, margin + 3 * colW + (colW / 2), currentY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${config.principalNip}`, margin + 3 * colW + (colW / 2), currentY + 17.5, { align: 'center' });

    const filename = `Detail_Pelaksanaan_7KAIH_${student.name.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  }

  /**
   * Export comprehensive classroom monthly report for Wali Kelas & School Archive with formal Kop Surat
   */
  static generateClassReport(
    className: string,
    teacherName: string,
    monthName: string,
    summary: ClassAnalysisSummary,
    studentsList: { student: User; score: number; level: HabitKategoriLevel; entriesCount: number; validationRate: number }[],
    customConfig?: SchoolSettings,
    teacherNip?: string
  ) {
    const config = customConfig || this.getActiveSchoolSettings();
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // 1. Official Kop Surat
    const startY = this.drawFormalKopSurat(doc, true, config);

    // 2. Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`REKAPITULASI HASIL ANALISIS 7 KEBIASAAN ANAK INDONESIA HEBAT (7 KAIH) - ${className.toUpperCase()}`, pageWidth / 2, startY + 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Periode: ${monthName} (TA ${config.academicYear} ${config.semester}) • Wali Kelas: ${teacherName} • ${config.fullName}`, pageWidth / 2, startY + 8, { align: 'center' });

    // 3. Summary Stat Cards (4 Columns)
    doc.setTextColor(30, 41, 59);
    const cardWidth = (pageWidth - 2 * margin - 9) / 4;
    const cardY = startY + 11;

    // Box 1: Total Siswa
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, cardY, cardWidth, 16, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL SISWA KELAS', margin + 4, cardY + 5);
    doc.setFontSize(12);
    doc.text(`${summary.totalStudents} Murid`, margin + 4, cardY + 12);

    // Box 2: Sudah Terbiasa
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin + cardWidth + 3, cardY, cardWidth, 16, 2, 2, 'FD');
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(8);
    doc.text('SUDAH TERBIASA (≥80%)', margin + cardWidth + 7, cardY + 5);
    doc.setFontSize(12);
    doc.text(`${summary.categoryDistribution.sudah_terbiasa} Siswa (${Math.round((summary.categoryDistribution.sudah_terbiasa / summary.totalStudents) * 100)}%)`, margin + cardWidth + 7, cardY + 12);

    // Box 3: Mulai Terbiasa
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin + (cardWidth + 3) * 2, cardY, cardWidth, 16, 2, 2, 'FD');
    doc.setTextColor(217, 119, 6);
    doc.setFontSize(8);
    doc.text('MULAI TERBIASA (50-79%)', margin + (cardWidth + 3) * 2 + 4, cardY + 5);
    doc.setFontSize(12);
    doc.text(`${summary.categoryDistribution.mulai_terbiasa} Siswa (${Math.round((summary.categoryDistribution.mulai_terbiasa / summary.totalStudents) * 100)}%)`, margin + (cardWidth + 3) * 2 + 4, cardY + 12);

    // Box 4: Belum Terbiasa
    doc.setFillColor(255, 228, 230);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(margin + (cardWidth + 3) * 3, cardY, cardWidth, 16, 2, 2, 'FD');
    doc.setTextColor(225, 29, 72);
    doc.setFontSize(8);
    doc.text('BELUM TERBIASA (<50%)', margin + (cardWidth + 3) * 3 + 4, cardY + 5);
    doc.setFontSize(12);
    doc.text(`${summary.categoryDistribution.belum_terbiasa} Siswa (${Math.round((summary.categoryDistribution.belum_terbiasa / summary.totalStudents) * 100)}%)`, margin + (cardWidth + 3) * 3 + 4, cardY + 12);

    doc.setTextColor(30, 41, 59);

    // 4. Students Detail Table
    const tableBody = studentsList.map((item, idx) => [
      (idx + 1).toString(),
      item.student.nis || item.student.nisn || '-',
      item.student.attendanceNumber || item.student.noAbsen || '-',
      item.student.name,
      `${item.entriesCount} Hari`,
      `${item.score}%`,
      KATEGORI_CONFIG[item.level].label,
      `${item.validationRate}% Tervalidasi`,
      item.score >= 80 
        ? 'Sangat disiplin & konsisten dalam 7 pilar kebiasaan' 
        : item.score >= 50 
        ? 'Perlu peningkatan konsistensi membaca literasi & istirahat tepat waktu' 
        : 'Perlu bimbingan khusus dari wali kelas dan pendampingan orang tua'
    ]);

    autoTable(doc, {
      startY: cardY + 19,
      head: [['No', 'NIS', 'No. Absen', 'Nama Lengkap Siswa', 'Jurnal', 'Skor Rerata', 'Kategori Keterbiasaan', 'Validasi Ortu', 'Rekomendasi / Catatan Pembinaan']],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 16 },
        3: { fontStyle: 'bold', cellWidth: 46 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
        6: { halign: 'center', fontStyle: 'bold', cellWidth: 34 },
        7: { halign: 'center', cellWidth: 24 },
        8: { cellWidth: 68 }
      }
    });

    let endY = (doc as any).lastAutoTable.finalY + 8;
    if (endY > 165) {
      doc.addPage();
      endY = 20;
    }

    // Signatures (Kepala Sekolah & Wali Kelas)
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${config.regency}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 60, endY);
    
    endY += 5;
    doc.text('Mengetahui,', 50, endY, { align: 'center' });
    doc.text(`Kepala ${config.name}`, 50, endY + 4, { align: 'center' });
    doc.text('Wali Kelas,', pageWidth - 50, endY + 4, { align: 'center' });

    const lookupTeacher = this.getTeacherForClass(className);
    const displayClassTeacherName = teacherName || lookupTeacher?.name || `Wali Kelas ${className}`;
    const displayClassTeacherNip = teacherNip 
      ? `NIP. ${teacherNip}` 
      : (lookupTeacher?.nip ? `NIP. ${lookupTeacher.nip}` : 'NIP. -');

    endY += 20;
    doc.setFont('helvetica', 'bold');
    doc.text(config.principalName, 50, endY, { align: 'center' });
    doc.text(displayClassTeacherName, pageWidth - 50, endY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${config.principalNip}`, 50, endY + 4, { align: 'center' });
    doc.text(displayClassTeacherNip, pageWidth - 50, endY + 4, { align: 'center' });

    const filename = `Rekap_Kelas_7KAIH_${className.replace(/\s+/g, '_')}_${monthName}.pdf`;
    doc.save(filename);
  }
}
