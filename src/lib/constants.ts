import { HabitDefinition, HabitId, User, SchoolClass, ReminderSetting, SchoolSettings, HabitKategoriLevel } from '../types';
import { 
  DATA_URI_SISWA_PUTRA, 
  DATA_URI_SISWA_PUTRI, 
  DATA_URI_ORANG_TUA, 
  DATA_URI_WALI_KELAS, 
  DATA_URI_ADMIN 
} from './avatarHelper';

export type ReligionType = 'Islam' | 'Katolik' | 'Kristen' | 'Hindu';

export interface ReligionPrayerItem {
  key: string;
  label: string;
  shortLabel: string;
  timeHint?: string;
}

export interface ReligionWorshipConfig {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  badge: string;
  activeBadge: string;
  mainTitle: string;
  mainPrayers: ReligionPrayerItem[];
  extraWorshipLabel: string;
  extraWorshipPlaceholder: string;
  holyBookLabel: string;
  holyBookPlaceholder: string;
  almsLabel: string;
  almsPlaceholder: string;
  spiritualNoteLabel: string;
  spiritualNotePlaceholder: string;
}

export const RELIGIONS_LIST: { id: ReligionType; name: string; icon: string }[] = [
  { id: 'Islam', name: 'Islam', icon: '🕌' },
  { id: 'Katolik', name: 'Katolik', icon: '⛪' },
  { id: 'Kristen', name: 'Kristen', icon: '✝️' },
  { id: 'Hindu', name: 'Hindu', icon: '🕉️' }
];

export const RELIGION_WORSHIP_CONFIGS: Record<string, ReligionWorshipConfig> = {
  Islam: {
    id: 'Islam',
    name: 'Islam',
    shortName: 'Islam',
    icon: '🕌',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    activeBadge: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    mainTitle: 'Ibadah Sholat Wajib 5 Waktu',
    mainPrayers: [
      { key: 'prayerFajr', label: 'Subuh', shortLabel: 'Subuh', timeHint: '04:30' },
      { key: 'prayerDhuhr', label: 'Dzuhur', shortLabel: 'Dzuhur', timeHint: '12:00' },
      { key: 'prayerAsr', label: 'Ashar', shortLabel: 'Ashar', timeHint: '15:15' },
      { key: 'prayerMaghrib', label: 'Maghrib', shortLabel: 'Maghrib', timeHint: '17:50' },
      { key: 'prayerIsha', label: 'Isya', shortLabel: 'Isya', timeHint: '19:00' }
    ],
    extraWorshipLabel: 'Puasa Sunnah / Sholat Sunnah (Tahajud / Dhuha / Rawatib)',
    extraWorshipPlaceholder: 'Contoh: Sholat Dhuha 4 Rakaat / Puasa Senin-Kamis',
    holyBookLabel: 'Membaca Kitab Suci Al-Qur\'an / Tadarus',
    holyBookPlaceholder: 'Contoh: QS. Al-Kahfi Ayat 1-20 / Juz 1 Hlm 1-5',
    almsLabel: 'Sedekah / Infaq / Berbagi Kebaikan',
    almsPlaceholder: 'Contoh: Infaq kotak amal masjid & berbagi makanan',
    spiritualNoteLabel: 'Doa / Dzikir & Rasa Syukur Hari Ini',
    spiritualNotePlaceholder: 'Tuliskan doa atau rasa syukurmu...'
  },
  Kristen: {
    id: 'Kristen',
    name: 'Kristen (Protestan)',
    shortName: 'Kristen',
    icon: '✝️',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    activeBadge: 'bg-blue-600 text-white border-blue-600 shadow-xs',
    mainTitle: 'Doa & Ibadah Harian',
    mainPrayers: [
      { key: 'prayerMorning', label: 'Doa Pagi / Saat Teduh', shortLabel: 'Saat Teduh', timeHint: 'Pagi' },
      { key: 'prayerNoon', label: 'Doa Makan & Siang', shortLabel: 'Doa Siang', timeHint: 'Siang' },
      { key: 'prayerNight', label: 'Doa Malam / Sebelum Tidur', shortLabel: 'Doa Malam', timeHint: 'Malam' },
      { key: 'sundayService', label: 'Ibadah Minggu / Sekolah Minggu / Komisi Remaja', shortLabel: 'Ibadah Minggu', timeHint: 'Ibadah' }
    ],
    extraWorshipLabel: 'Renungan Harian / Pelayanan / Puasa Kristen',
    extraWorshipPlaceholder: 'Contoh: Membaca Renungan Santapan Harian / Pelayanan Musik Gereja',
    holyBookLabel: 'Membaca & Merenungkan Alkitab',
    holyBookPlaceholder: 'Contoh: Mazmur 23:1-6 / Yohanes 3:16-17 / Amsal 3:5-6',
    almsLabel: 'Persembahan Kasih / Diakonia / Berbagi Sesama',
    almsPlaceholder: 'Contoh: Persembahan syukur ibadah & berbagi bekal dengan teman',
    spiritualNoteLabel: 'Doa Syafaat & Ungkapan Syukur Hari Ini',
    spiritualNotePlaceholder: 'Tuliskan pokok doa syafaat atau rasa syukurmu...'
  },
  Katolik: {
    id: 'Katolik',
    name: 'Katolik',
    shortName: 'Katolik',
    icon: '⛪',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    activeBadge: 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
    mainTitle: 'Doa Liturgi & Ibadah Harian',
    mainPrayers: [
      { key: 'prayerAngelus', label: 'Doa Angelus / Malaikat Tuhan (Pagi/Siang/Sore)', shortLabel: 'Doa Angelus', timeHint: 'Angelus' },
      { key: 'prayerRosary', label: 'Doa Rosario / Kerahiman Ilahi', shortLabel: 'Doa Rosario', timeHint: 'Rosario' },
      { key: 'prayerNight', label: 'Doa Malam / Pemeriksaan Batin (Examen)', shortLabel: 'Doa Malam', timeHint: 'Malam' },
      { key: 'holyMass', label: 'Perayaan Ekaristi / Misa Kudus', shortLabel: 'Misa Kudus', timeHint: 'Misa' }
    ],
    extraWorshipLabel: 'Devosi / Novena / Pantang & Puasa',
    extraWorshipPlaceholder: 'Contoh: Doa Rosario 1 Peristiwa / Novena Tiga Salam Maria',
    holyBookLabel: 'Membaca Kitab Suci Alkitab Katolik (Deuterokanonika)',
    holyBookPlaceholder: 'Contoh: Injil Hari Ini (Matius 5:1-12) / Mazmur Tanggapan',
    almsLabel: 'Kolekte / Aksi Puasa Pembangunan (APP) / Aksi Kasih',
    almsPlaceholder: 'Contoh: Kolekte perayaan ekaristi & kotak aksi kasih',
    spiritualNoteLabel: 'Refleksi Rohani & Doa Syukur Hari Ini',
    spiritualNotePlaceholder: 'Tuliskan refleksi firman Tuhan atau ungkapan syukurmu...'
  },
  Hindu: {
    id: 'Hindu',
    name: 'Hindu',
    shortName: 'Hindu',
    icon: '🕉️',
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    activeBadge: 'bg-orange-600 text-white border-orange-600 shadow-xs',
    mainTitle: 'Puja Trisandya & Kramaning Sembah',
    mainPrayers: [
      { key: 'trisandyaMorning', label: 'Trisandya Pagi (Brahma Muhurta - 06:00)', shortLabel: 'Trisandya Pagi', timeHint: '06:00' },
      { key: 'trisandyaNoon', label: 'Trisandya Siang (Madhyama Sandhya - 12:00)', shortLabel: 'Trisandya Siang', timeHint: '12:00' },
      { key: 'trisandyaEvening', label: 'Trisandya Sore (Sayam Sandhya - 18:00)', shortLabel: 'Trisandya Sore', timeHint: '18:00' },
      { key: 'pancaSembahyang', label: 'Panca Sembahyang (Kramaning Sembah)', shortLabel: 'Panca Sembahyang', timeHint: 'Sembahyang' }
    ],
    extraWorshipLabel: 'Menghaturkan Canang Sari / Upawasa / Purnama / Tilem',
    extraWorshipPlaceholder: 'Contoh: Menghaturkan Canang Sari di Pelangkiran/Merajan / Upawasa',
    holyBookLabel: 'Membaca & Melantunkan Sloka Bhagawad Gita / Weda',
    holyBookPlaceholder: 'Contoh: Bhagawad Gita Bab 2 Sloka 47 / Sarasamuccaya Sloka 1',
    almsLabel: 'Dana Punia / Tat Twam Asi (Tolong Menolong)',
    almsPlaceholder: 'Contoh: Menghaturkan Dana Punia & berbuat kebajikan pada sesama',
    spiritualNoteLabel: 'Pengucapan Gayatri Mantram & Doa Syukur Hari Ini',
    spiritualNotePlaceholder: 'Tuliskan bait mantram atau rasa syukurmu...'
  },
  Buddha: {
    id: 'Buddha',
    name: 'Buddha',
    shortName: 'Buddha',
    icon: '☸️',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    activeBadge: 'bg-amber-600 text-white border-amber-600 shadow-xs',
    mainTitle: 'Puja Bakti & Meditasi Harian',
    mainPrayers: [
      { key: 'pujaMorning', label: 'Puja Bakti Pagi', shortLabel: 'Puja Pagi', timeHint: 'Pagi' },
      { key: 'pujaEvening', label: 'Puja Bakti Malam', shortLabel: 'Puja Malam', timeHint: 'Malam' },
      { key: 'meditation', label: 'Meditasi (Samatha / Bhavana)', shortLabel: 'Meditasi', timeHint: 'Meditasi' },
      { key: 'sundayPuja', label: 'Kebaktian Minggu di Vihara', shortLabel: 'Kebaktian', timeHint: 'Vihara' }
    ],
    extraWorshipLabel: 'Melatih Sila (Pancasila Buddhis) / Uposatha',
    extraWorshipPlaceholder: 'Contoh: Meditasi pernapasan 15 menit & melatih cinta kasih (Metta)',
    holyBookLabel: 'Membaca Kitab Suci Dhammapada / Paritta',
    holyBookPlaceholder: 'Contoh: Dhammapada Yamakavagga bait 1-5 / Mangala Sutta',
    almsLabel: 'Berdana (Dana Paramita) / Menolong Sesama',
    almsPlaceholder: 'Contoh: Berdana makanan/kebutuhan kepada sesama & Sangha',
    spiritualNoteLabel: 'Refleksi Dharma, Metta & Doa Kebajikan',
    spiritualNotePlaceholder: 'Tuliskan refleksi batin atau doa cinta kasih...'
  },
  Konghucu: {
    id: 'Konghucu',
    name: 'Konghucu',
    shortName: 'Konghucu',
    icon: '☯️',
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
    activeBadge: 'bg-red-600 text-white border-red-600 shadow-xs',
    mainTitle: 'Sembahyang Tian & Kebajikan',
    mainPrayers: [
      { key: 'sembahyangTianPagi', label: 'Sembahyang Pagi (Jing Tian)', shortLabel: 'Sembahyang Pagi', timeHint: 'Pagi' },
      { key: 'sembahyangTianSore', label: 'Sembahyang Sore (Shen Tian)', shortLabel: 'Sembahyang Sore', timeHint: 'Sore' },
      { key: 'penghormatanLeluhur', label: 'Penghormatan Leluhur (Xiao)', shortLabel: 'Hormat Leluhur', timeHint: 'Leluhur' },
      { key: 'ibadahLitang', label: 'Kebaktian di Lithang / Kelenteng', shortLabel: 'Kebaktian', timeHint: 'Kelenteng' }
    ],
    extraWorshipLabel: 'Melatih Delapan Kebajikan (Ba De) / Ren',
    extraWorshipPlaceholder: 'Contoh: Melatih sikap bakti kepada orang tua (Xiao) & ketulusan (Zhong)',
    holyBookLabel: 'Membaca Kitab Suci Si Shu & Wu Jing',
    holyBookPlaceholder: 'Contoh: Kitab Lun Yu (Sabda Suci) Bab 1',
    almsLabel: 'Berbuat Kebajikan / Amal Kasih',
    almsPlaceholder: 'Contoh: Beramal untuk fakir miskin & berbagi kebaikan',
    spiritualNoteLabel: 'Renungan Firman Tian & Refleksi Batin',
    spiritualNotePlaceholder: 'Tuliskan renungan firman Tian atau tekad kebajikan...'
  }
};

export const getReligionConfig = (religionName?: string): ReligionWorshipConfig => {
  if (!religionName) return RELIGION_WORSHIP_CONFIGS.Islam;
  const clean = religionName.trim().toLowerCase();
  if (clean.includes('kristen') || clean.includes('protestan')) return RELIGION_WORSHIP_CONFIGS.Kristen;
  if (clean.includes('katolik')) return RELIGION_WORSHIP_CONFIGS.Katolik;
  if (clean.includes('hindu')) return RELIGION_WORSHIP_CONFIGS.Hindu;
  if (clean.includes('buddha') || clean.includes('budha')) return RELIGION_WORSHIP_CONFIGS.Buddha;
  if (clean.includes('konghucu') || clean.includes('khonghucu')) return RELIGION_WORSHIP_CONFIGS.Konghucu;
  return RELIGION_WORSHIP_CONFIGS.Islam;
};


export const HABIT_DEFINITIONS: Record<HabitId, HabitDefinition> = {
  bangun_pagi: {
    id: 'bangun_pagi',
    order: 1,
    title: '1. Bangun Pagi',
    shortName: 'Bangun Pagi',
    tagline: 'Memulai hari dengan semangat dan kesegaran jiwa',
    description: 'Membiasakan bangun lebih awal sebelum subuh/fajar untuk mempersiapkan diri dan beribadah.',
    iconName: 'Sun',
    color: 'amber',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    badgeText: 'text-amber-600 dark:text-amber-400',
    defaultTime: '05:00',
    subTasks: [
      { key: 'wakeTime', label: 'Waktu Bangun', type: 'time', required: true },
      { key: 'bedMade', label: 'Merapikan Tempat Tidur Sendiri', type: 'checkbox' },
      { key: 'drinkWater', label: 'Minum Segelas Air Hangat saat Bangun', type: 'checkbox' },
      { key: 'morningMood', label: 'Kondisi Perasaan Pagi', type: 'select', options: ['Sangat Bersemangat 😊', 'Ceria & Segar 😄', 'Cukup Segar 😐', 'Agak Mengantuk 🥱'] }
    ]
  },
  ibadah: {
    id: 'ibadah',
    order: 2,
    title: '2. Beribadah Tepat Waktu',
    shortName: 'Beribadah',
    tagline: 'Membangun ketaatan spiritual dan kedekatan pada Tuhan YME',
    description: 'Menunaikan sholat/ibadah wajib tepat waktu, sholat sunnah/puasa, membaca kitab suci, dan bersedekah.',
    iconName: 'HeartHandshake',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    defaultTime: '05:30',
    subTasks: [
      { key: 'prayerFajr', label: 'Ibadah Pagi / Sholat Subuh Berjamaah', type: 'checkbox' },
      { key: 'prayerDhuhr', label: 'Ibadah Siang / Sholat Dzuhur', type: 'checkbox' },
      { key: 'prayerAsr', label: 'Ibadah Sore / Sholat Ashar', type: 'checkbox' },
      { key: 'prayerMaghrib', label: 'Ibadah Petang / Sholat Maghrib', type: 'checkbox' },
      { key: 'prayerIsha', label: 'Ibadah Malam / Sholat Isya', type: 'checkbox' },
      { key: 'sunnahWorship', label: 'Puasa / Sholat Sunnah (Tahajud / Dhuha / Rawatib)', type: 'checkbox' },
      { key: 'sunnahDetail', label: 'Keterangan Sholat Sunnah / Puasa', type: 'text', placeholder: 'Contoh: Sholat Dhuha 4 Rakaat / Puasa Senin-Kamis' },
      { key: 'holyBookReading', label: 'Membaca Kitab Suci / Tadarus Al-Qur\'an', type: 'checkbox' },
      { key: 'holyBookDetail', label: 'Surat / Ayat / Halaman Kitab Suci', type: 'text', placeholder: 'Contoh: QS. Al-Kahfi Ayat 1-20 / Juz 1 Hlm 1-5' },
      { key: 'almsGiving', label: 'Sedekah / Infaq / Berbagi Kebaikan', type: 'checkbox' },
      { key: 'almsDetail', label: 'Catatan Sedekah / Kebaikan', type: 'text', placeholder: 'Contoh: Infaq kotak amal masjid & berbagi makanan' },
      { key: 'spiritualNote', label: 'Doa/Kebaikan Spiritual Hari Ini', type: 'text', placeholder: 'Tuliskan doa atau rasa syukurmu...' }
    ]
  },
  olahraga: {
    id: 'olahraga',
    order: 3,
    title: '3. Berolahraga & Aktivitas Fisik',
    shortName: 'Berolahraga',
    tagline: 'Menjaga kebugaran jasmani agar kuat dan sehat',
    description: 'Melakukan gerak badan, senam, jalan santai, lari, bersepeda atau olahraga minimal 15-30 menit.',
    iconName: 'Activity',
    color: 'rose',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
    badgeText: 'text-rose-600 dark:text-rose-400',
    defaultTime: '06:15',
    subTasks: [
      { key: 'exerciseType', label: 'Jenis Olahraga', type: 'select', options: ['Senam Pagi / Stretching', 'Jalan Kaki / Lari', 'Bersepeda', 'Sepak Bola / Futsal', 'Bulu Tangkis / Basket', 'Lainnya'], required: true },
      { key: 'durationMin', label: 'Durasi (Menit)', type: 'number', unit: 'menit', placeholder: 'contoh: 20' },
      { key: 'bodyCondition', label: 'Kondisi Tubuh Setelah Olahraga', type: 'select', options: ['Sangat Bugar 💪', 'Berkeringat Sehat 🏃', 'Cukup Bugar 🚶'] }
    ]
  },
  makan_sehat: {
    id: 'makan_sehat',
    order: 4,
    title: '4. Makan Sehat & Bergizi',
    shortName: 'Makan Sehat',
    tagline: 'Memenuhi nutrisi seimbang untuk pertumbuhan optimal',
    description: 'Pola makan teratur (Sarapan, Makan Siang, Makan Malam bergizi), sayur buah, dan minum air putih cukup.',
    iconName: 'Apple',
    color: 'green',
    badgeBg: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    badgeText: 'text-green-600 dark:text-green-400',
    defaultTime: '06:45',
    subTasks: [
      { key: 'breakfastEaten', label: 'Sarapan Pagi Bergizi', type: 'checkbox' },
      { key: 'breakfastMenu', label: 'Pilihan Menu Sarapan', type: 'select', options: ['Nasi + Telur Mata Sapi + Tumis Sayur', 'Bubur Ayam Sehat + Kacang & Telur', 'Roti Gandum + Telur Rebus + Susu', 'Nasi Uduk Komplit Sehat', 'Oatmeal Buah + Madu', 'Tulis Menu Lainnya'] },
      { key: 'breakfastCustom', label: 'Menu Sarapan Lainnya', type: 'text', placeholder: 'Tuliskan menu sarapan sehatmu...' },
      { key: 'lunchEaten', label: 'Makan Siang Sehat & Seimbang', type: 'checkbox' },
      { key: 'lunchMenu', label: 'Pilihan Menu Makan Siang', type: 'select', options: ['Nasi + Ikan Bakar / Ayam + Sayur Asam / Bayam', 'Nasi + Tahu Tempe + Sayur Sop Sehat', 'Gado-Gado / Pecel Sayur Telur', 'Soto Sehat Daging & Sayuran', 'Tulis Menu Lainnya'] },
      { key: 'lunchCustom', label: 'Menu Makan Siang Lainnya', type: 'text', placeholder: 'Tuliskan menu makan siang sehatmu...' },
      { key: 'dinnerEaten', label: 'Makan Malam Bergizi (Sebelum Pukul 19.30)', type: 'checkbox' },
      { key: 'dinnerMenu', label: 'Pilihan Menu Makan Malam', type: 'select', options: ['Nasi Porsi Sedang + Sup Ayam Sayuran', 'Tumis Sayur Hijau + Tahu / Tempe / Telur', 'Salad Sayur / Buah + Protein Sehat', 'Menu Ringan Sehat', 'Tulis Menu Lainnya'] },
      { key: 'dinnerCustom', label: 'Menu Makan Malam Lainnya', type: 'text', placeholder: 'Tuliskan menu makan malam sehatmu...' },
      { key: 'hasVegetables', label: 'Makan Sayur-sayuran Hijau / Segar', type: 'checkbox' },
      { key: 'hasFruits', label: 'Makan Buah-buahan', type: 'checkbox' },
      { key: 'waterGlasses', label: 'Jumlah Gelas Air Putih Hari Ini', type: 'number', unit: 'gelas', placeholder: 'Target: 8 gelas' },
      { key: 'avoidJunkFood', label: 'Menghindari Makanan Ringan Cepat Saji / Minuman Manis Berlebih', type: 'checkbox' }
    ]
  },
  membaca: {
    id: 'membaca',
    order: 5,
    title: '5. Gemar Belajar & Literasi',
    shortName: 'Gemar Belajar',
    tagline: 'Membuka jendela ilmu pengetahuan dan wawasan dunia',
    description: 'Belajar dan membaca materi pelajaran atau buku inspiratif dengan jam mulai dan selesai yang teratur.',
    iconName: 'BookOpen',
    color: 'blue',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    badgeText: 'text-blue-600 dark:text-blue-400',
    defaultTime: '16:00',
    subTasks: [
      { key: 'bookTitle', label: 'Judul Buku / Materi Pelajaran', type: 'text', placeholder: 'Contoh: IPA Bab Energi / Kisah Tokoh Sains', required: true },
      { key: 'startTime', label: 'Jam Mulai Belajar', type: 'time', required: true },
      { key: 'endTime', label: 'Jam Berakhir Belajar', type: 'time', required: true },
      { key: 'pageRange', label: 'Halaman / Bab yang Dipelajari', type: 'text', placeholder: 'Contoh: Hlm. 12 - 25' },
      { key: 'summaryInsight', label: 'Pesan / Ilmu Baru yang Didapatkan', type: 'text', placeholder: 'Satu kalimat intisari pelajaran...' }
    ]
  },
  bermasyarakat: {
    id: 'bermasyarakat',
    order: 6,
    title: '6. Bermasyarakat & Tolong Menolong',
    shortName: 'Bermasyarakat',
    tagline: 'Menumbuhkan empati, gotong royong, dan kesantunan sosial',
    description: 'Melakukan kegiatan sosial nyata bersama keluarga, teman, atau tetangga yang bermanfaat bagi lingkungan.',
    iconName: 'Users',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
    defaultTime: '17:30',
    subTasks: [
      { key: 'activityName', label: 'Nama Kegiatan Sosial / Tolong Menolong', type: 'text', placeholder: 'Contoh: Membantu membersihkan lingkungan / Membantu kerja kelompok', required: true },
      { key: 'withWhom', label: 'Dengan Siapa Kegiatan Dilakukan', type: 'select', options: ['Keluarga', 'Teman', 'Tetangga'], required: true },
      { key: 'benefits', label: 'Manfaat Kegiatan yang Dirasakan', type: 'text', placeholder: 'Contoh: Lingkungan jadi bersih dan mempererat silaturahmi', required: true },
      { key: 'helpParents', label: 'Membantu Pekerjaan Rumah Orang Tua', type: 'checkbox' },
      { key: 'cleanEnvironment', label: 'Menjaga Kebersihan Lingkungan Sekitar', type: 'checkbox' },
      { key: 'socialNotes', label: 'Catatan / Cerita Kebaikan Hari Ini', type: 'text', placeholder: 'Contoh: Membantu ibu mencuci piring & berbagi cemilan dengan tetangga' }
    ]
  },
  istirahat: {
    id: 'istirahat',
    order: 7,
    title: '7. Istirahat & Tidur Tepat Waktu',
    shortName: 'Istirahat Tepat Waktu',
    tagline: 'Memulihkan energi dan menjaga kesehatan organ tubuh',
    description: 'Tidur tidak larut malam (maksimal pukul 21.00 - 21.30) agar esok hari bangun bugar dan fokus.',
    iconName: 'Moon',
    color: 'purple',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    badgeText: 'text-purple-600 dark:text-purple-400',
    defaultTime: '21:00',
    subTasks: [
      { key: 'targetSleepTime', label: 'Target Waktu Tidur Malam', type: 'time', required: true },
      { key: 'noScreenBeforeBed', label: 'Mematikan Gadget / HP 30 Menit Sebelum Tidur', type: 'checkbox' },
      { key: 'brushTeeth', label: 'Menggosok Gigi & Berwudhu/Cuci Kaki Tangan', type: 'checkbox' },
      { key: 'nightPray', label: 'Berdoa Sebelum Tidur', type: 'checkbox' }
    ]
  }
};

export const HABIT_LIST = Object.values(HABIT_DEFINITIONS);

export const DEFAULT_REMINDERS: ReminderSetting[] = [
  { habitId: 'bangun_pagi', enabled: true, time: '05:00', sound: true },
  { habitId: 'ibadah', enabled: true, time: '05:30', sound: true },
  { habitId: 'olahraga', enabled: true, time: '06:15', sound: true },
  { habitId: 'makan_sehat', enabled: true, time: '07:00', sound: true },
  { habitId: 'membaca', enabled: true, time: '16:00', sound: true },
  { habitId: 'bermasyarakat', enabled: true, time: '17:30', sound: true },
  { habitId: 'istirahat', enabled: true, time: '21:00', sound: true }
];

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  name: 'SMP Negeri 2 Kasihan',
  fullName: 'SMP NEGERI 2 KASIHAN',
  npsn: '20400342',
  akreditasi: 'A (Unggul)',
  government: 'PEMERINTAH KABUPATEN BANTUL',
  department: 'DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA',
  address: 'Jl. Bibis, Jetis, Tamantirto, Kasihan, Bantul',
  subDistrict: 'Kasihan',
  regency: 'Bantul',
  province: 'D.I. Yogyakarta',
  postalCode: '55183',
  phone: '(0274) 379348',
  email: 'smpn2kasihan@gmail.com',
  website: 'www.smpn2kasihan.sch.id',
  principalName: 'Sugiyarto, S.Pd., M.Pd.',
  principalNip: '19700512 199512 1 002',
  academicYear: '2025/2026',
  semester: 'Genap',
  customLogoUrl: ''
};

export const SCHOOL_CONFIG = DEFAULT_SCHOOL_SETTINGS;

export const DEMO_CLASSES: SchoolClass[] = [
  {
    id: 'class-7a',
    name: '7A (Unggulan)',
    academicYear: '2025/2026',
    teacherId: 'usr-walikelas-1',
    teacherName: 'Ibu Siti Rahmawati, S.Pd.',
    teacherNip: '19850314 200801 2 007',
    studentCount: 32
  },
  {
    id: 'class-7b',
    name: '7B',
    academicYear: '2025/2026',
    teacherId: 'usr-walikelas-1',
    teacherName: 'Ibu Siti Rahmawati, S.Pd.',
    teacherNip: '19850314 200801 2 007',
    studentCount: 30
  },
  {
    id: 'class-8a',
    name: '8A',
    academicYear: '2025/2026',
    teacherId: 'usr-walikelas-1',
    teacherName: 'Ibu Siti Rahmawati, S.Pd.',
    teacherNip: '19850314 200801 2 007',
    studentCount: 28
  }
];

export const DEMO_USERS: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Administrator IT Sekolah',
    email: 'admin',
    role: 'admin',
    phone: '081299887766',
    avatar: DATA_URI_ADMIN,
    password: 'admin123#Master',
    schoolName: 'SMP Negeri 2 Kasihan',
    createdAt: '2025-07-15T08:00:00.000Z'
  },
  {
    id: 'usr-walikelas-1',
    name: 'Ibu Siti Rahmawati, S.Pd.',
    nip: '19850314 200801 2 007',
    email: 'wali.7a',
    role: 'walikelas',
    assignedClassIds: ['class-7a', 'class-7b', 'class-8a'],
    className: '7A (Wali Kelas)',
    phone: '081122334455',
    avatar: DATA_URI_WALI_KELAS,
    password: 'wali123#Secure',
    schoolName: 'SMP Negeri 2 Kasihan',
    createdAt: '2025-07-15T08:00:00.000Z'
  }
];

export const KATEGORI_CONFIG = {
  belum_terbiasa: {
    label: 'Belum Terbiasa',
    minScore: 0,
    maxScore: 49.9,
    color: 'rose',
    badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    textClass: 'text-rose-600 dark:text-rose-400',
    description: 'Memerlukan pendampingan intensif dari orang tua dan bimbingan wali kelas.'
  },
  mulai_terbiasa: {
    label: 'Mulai Terbiasa',
    minScore: 50,
    maxScore: 79.9,
    color: 'amber',
    badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    textClass: 'text-amber-600 dark:text-amber-400',
    description: 'Menunjukkan perkembangan baik, perlu menjaga konsistensi pada beberapa kebiasaan.'
  },
  sudah_terbiasa: {
    label: 'Sudah Terbiasa / Sangat Terbiasa',
    minScore: 80,
    maxScore: 100,
    color: 'emerald',
    badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Pola 7 Kebiasaan Anak Indonesia Hebat telah tertanam kuat dan konsisten setiap hari.'
  }
};

export const getKategoriLevel = (score: number): 'belum_terbiasa' | 'mulai_terbiasa' | 'sudah_terbiasa' => {
  if (score >= 80) return 'sudah_terbiasa';
  if (score >= 50) return 'mulai_terbiasa';
  return 'belum_terbiasa';
};

export const RELIGIONS_CONFIG = RELIGION_WORSHIP_CONFIGS;

export interface PrayerStatusItem {
  key: string;
  label: string;
  shortLabel: string;
  timeHint?: string;
  isExecuted: boolean;
}

export const getWorshipStatusList = (religionName?: string, values?: any): PrayerStatusItem[] => {
  const config = getReligionConfig(religionName || values?.religion);
  const v = values || {};
  const isIslam = config.id === 'Islam';
  const allFive = !!(v.prayerFiveTimes || v.prayer_five_times);

  return config.mainPrayers.map((p) => {
    let isExecuted = !!v[p.key];

    if (isIslam) {
      if (allFive) {
        isExecuted = true;
      } else if (p.key === 'prayerFajr' && (v.fajr || v.subuh)) {
        isExecuted = true;
      } else if (p.key === 'prayerDhuhr' && (v.dhuhr || v.dzuhur)) {
        isExecuted = true;
      } else if (p.key === 'prayerAsr' && (v.asr || v.ashar)) {
        isExecuted = true;
      } else if (p.key === 'prayerMaghrib' && v.maghrib) {
        isExecuted = true;
      } else if (p.key === 'prayerIsha' && (v.isha || v.isya)) {
        isExecuted = true;
      }
    }

    return {
      key: p.key,
      label: p.label,
      shortLabel: p.shortLabel,
      timeHint: p.timeHint,
      isExecuted
    };
  });
};

export const formatWorshipDetailedStatus = (religionName?: string, values?: any): string => {
  const list = getWorshipStatusList(religionName, values);
  return list.map(p => `${p.shortLabel}: ${p.isExecuted ? '✓' : '✗'}`).join(' • ');
};

/**
 * Helper to calculate total number of days in a given month string (e.g. 'September 2026' -> 30)
 */
export const getDaysInMonth = (monthStr?: string): number => {
  if (!monthStr) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  const normalized = monthStr.toLowerCase();
  const monthsMap: Record<string, number> = {
    januari: 31,
    februari: 28,
    maret: 31,
    april: 30,
    mei: 31,
    juni: 30,
    juli: 31,
    agustus: 31,
    september: 30,
    oktober: 31,
    november: 30,
    desember: 31
  };
  for (const [mName, days] of Object.entries(monthsMap)) {
    if (normalized.includes(mName)) {
      if (mName === 'februari') {
        const yearMatch = normalized.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        return isLeap ? 29 : 28;
      }
      return days;
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

/**
 * Helper to get the current running month label in Indonesian (e.g. 'September 2026')
 */
export const getCurrentRunningMonthStr = (): string => {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const now = new Date();
  return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
};

/**
 * Helper to check if a date string (YYYY-MM-DD) falls within a given month label (e.g. 'September 2026' or 'September')
 */
export const isDateInMonth = (dateStr?: string, monthStr?: string): boolean => {
  if (!dateStr) return false;
  if (!monthStr) return true;
  
  const normalized = monthStr.toLowerCase();
  const monthsMap: Record<string, string> = {
    januari: '01',
    februari: '02',
    maret: '03',
    april: '04',
    mei: '05',
    juni: '06',
    juli: '07',
    agustus: '08',
    september: '09',
    oktober: '10',
    november: '11',
    desember: '12'
  };

  let targetMonthCode = '';
  for (const [name, code] of Object.entries(monthsMap)) {
    if (normalized.includes(name)) {
      targetMonthCode = code;
      break;
    }
  }

  if (!targetMonthCode) return true;

  const yearMatch = normalized.match(/\d{4}/);
  const targetYear = yearMatch ? yearMatch[0] : '';

  if (targetYear) {
    return dateStr.startsWith(`${targetYear}-${targetMonthCode}`);
  }

  return dateStr.includes(`-${targetMonthCode}-`);
};

/**
 * Aturan Kebijakan Rekapitulasi Laporan:
 * Isian jurnal yang belum diverifikasi dan divalidasi oleh orang tua, maka TIDAK AKAN masuk dalam rekapitulasi laporan.
 * Fungsi ini mengecek apakah jurnal telah tervalidasi secara sah oleh orang tua / wali.
 */
export const isJournalParentValidated = (journal: any): boolean => {
  if (!journal) return false;

  // Jika status jurnal adalah needs_revision atau validasi ortu ditandai 'invalid', maka belum sah
  if (journal.status === 'needs_revision' || journal.parentValidation?.status === 'invalid') {
    return false;
  }

  // Harus memiliki tanda validasi yang sah dari orang tua
  const hasParentApproval = 
    journal.parentValidation?.validated === true ||
    journal.parentValidation?.status === 'valid' ||
    journal.status === 'validated';

  return Boolean(hasParentApproval);
};

export interface JournalScoreDetails {
  overallScore: number;
  worshipCount: number;
  worshipTotal: number;
  worshipScore: number;
  otherCompletedCount: number;
  kategoriLevel: HabitKategoriLevel;
  displaySummary: string;
}

/**
 * Menghitung persentase keterlaksanaan jurnal 7 KAIH
 * Sesuai ketentuan: Keterlaksanaan sholat lima waktu masuk hitungan dalam persentase keterlaksanaan
 * Tiap waktu sholat berkontribusi terhadap persentase ibadah dan skor keseluruhan.
 */
export const calculateJournalScore = (
  habits?: Record<string, any>,
  religion?: string
): JournalScoreDetails => {
  const h = habits || {};
  const otherHabitKeys = ['bangun_pagi', 'olahraga', 'makan_sehat', 'membaca', 'bermasyarakat', 'istirahat'];
  let otherCompletedCount = 0;
  otherHabitKeys.forEach(k => {
    if (h[k]?.completed) otherCompletedCount++;
  });

  const ib = h['ibadah'];
  const rel = (ib?.values?.religion || religion || 'Islam') as string;
  const worshipList = getWorshipStatusList(rel, ib?.values);
  const worshipTotal = worshipList.length || 5;
  const worshipCount = worshipList.filter(p => p.isExecuted).length;

  // Persentase ibadah (sholat 5 waktu)
  const worshipScore = worshipTotal > 0 ? Math.round((worshipCount / worshipTotal) * 100) : 0;
  
  // Persentase total 7 KAIH: rata-rata 7 pilar di mana pilar ibadah dihitung proporsional dari sholat yang terlaksana
  const overallScore = Math.round(((otherCompletedCount * 100) + worshipScore) / 7);

  let kategoriLevel: HabitKategoriLevel = 'belum_terbiasa';
  if (overallScore >= 80) kategoriLevel = 'sudah_terbiasa';
  else if (overallScore >= 50) kategoriLevel = 'mulai_terbiasa';

  const displaySummary = `${overallScore}% (${worshipCount}/${worshipTotal} Sholat • ${otherCompletedCount}/6 Habit Lain)`;

  return {
    overallScore,
    worshipCount,
    worshipTotal,
    worshipScore,
    otherCompletedCount,
    kategoriLevel,
    displaySummary
  };
};

/**
 * Format tanggal standar dd/mm/yy (misal: "2026-09-07" -> "07/09/26")
 */
export const formatDateDDMMYY = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        const yy = match[1].slice(-2);
        const mm = match[2].padStart(2, '0');
        const dd = match[3].padStart(2, '0');
        return `${dd}/${mm}/${yy}`;
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      }
      return trimmed;
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const dd = String(dateInput.getDate()).padStart(2, '0');
      const mm = String(dateInput.getMonth() + 1).padStart(2, '0');
      const yy = String(dateInput.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
  } catch {
    // fallback
  }
  return String(dateInput);
};

