export interface FAQ {
    question: string;
    answer: string;
}

export interface FAQData {
    landing: FAQ[];
    booking: FAQ[];
    status: FAQ[];
    packages: FAQ[];
    default: FAQ[];
}

export const faqs: FAQData = {
    landing: [
        { question: "Studio 8 itu apa?", answer: "Studio 8 adalah studio foto modern dengan konsep self-service atau difotoin fotografer profesional. Kamu bisa bebas berekspresi dengan peralatan berkualitas tinggi!" },
        { question: "Bagaimana cara booking?", answer: "Gampang banget! Kamu bisa klik tombol 'Booking Sekarang' atau 'Lihat Paket' di halaman ini, lalu ikuti langkah-langkahnya." },
        { question: "Lokasinya di mana?", answer: "Kami berada di Jl. Banjar - Pangandaran, tepat di depan SMK 4 Banjar, Pataruman, Kota Banjar. Gampang banget ditemuin!" },
        { question: "Ada paket apa saja?", answer: "Kami punya banyak pilihan, dari Self Photo, Couple Session, Grup, sampai paket Yearbook. Cek halaman 'Paket' untuk detail lengkapnya ya!" },
    ],
    booking: [
        { question: "Berapa DP (Uang Muka) yang harus saya bayar?", answer: "Untuk sesi individual, kamu hanya perlu bayar DP sebesar Rp 35.000 untuk mengamankan jadwal. Untuk booking institusi, skema pembayaran akan didiskusikan lebih lanjut." },
        { question: "Metode pembayaran apa saja yang tersedia?", answer: "Kami menerima pembayaran melalui QRIS, Transfer Bank (BNI & BRI), Dana, dan Shopeepay." },
        { question: "Apakah saya bisa menggunakan kode referral?", answer: "Tentu! Jika ini booking pertamamu, kamu bisa masukkan kode referral dari temanmu untuk dapat diskon. Temanmu juga bakal dapat poin bonus, lho!" },
        { question: "Bagaimana jika saya punya kode promo?", answer: "Asik! Masukkan kode promo di langkah ke-3 (Add-ons & Diskon) untuk mendapatkan potongan harga. Ingat ya, hanya satu kode (promo atau referral) yang bisa dipakai per transaksi." },
    ],
    status: [
        { question: "Bagaimana cara mengubah jadwal (reschedule)?", answer: "Kamu bisa ajukan reschedule maksimal 7 hari (H-7) sebelum jadwal sesi. Cari booking-mu di halaman ini, nanti akan ada tombol untuk mengajukan jadwal ulang jika memenuhi syarat." },
        { question: "Bagaimana jika saya ingin membatalkan booking?", answer: "Pembatalan lebih dari 24 jam (H-1) sebelum sesi akan dapat pengembalian DP penuh. Kalau kurang dari 24 jam, DP akan hangus ya." },
        { question: "Di mana saya bisa melihat hasil foto saya?", answer: "Setelah sesi selesai dan admin sudah mengunggah hasilnya, link Google Drive akan muncul di detail booking-mu di halaman ini. Kamu bisa langsung download dari sana." },
        { question: "Saya tidak menemukan kode booking saya.", answer: "Pastikan kamu memasukkan kode booking dengan benar, termasuk tanda strip (-) dan huruf kapitalnya. Contoh: S8-ABCDE. Kalau masih tidak ketemu, coba cek email atau WhatsApp konfirmasi dari kami." },
    ],
    packages: [
        { question: "Apa bedanya paket Self Photo dan Couple?", answer: "Paket Self Photo biasanya untuk satu orang dengan durasi lebih singkat. Paket Couple/Group dirancang untuk 2 orang atau lebih dengan durasi sesi yang lebih lama dan properti yang lebih beragam." },
        { question: "Paket mana yang cocok untuk wisuda?", answer: "Untuk wisuda, kami merekomendasikan paket Couple/Group karena kamu bisa berfoto dengan teman atau keluarga. Kamu juga bisa menambahkan layanan cetak foto sebagai kenang-kenangan!" },
        { question: "Apakah ada diskon untuk grup besar?", answer: "Ada! Untuk grup besar seperti foto kelas atau acara kantor, lebih baik ajukan booking melalui form 'Booking Instansi' untuk mendapatkan penawaran khusus." },
        { question: "Saya bingung, paket mana yang harus dipilih?", answer: "Coba gunakan fitur 'Rekomendasi AI' di atas! Cukup ceritakan kebutuhanmu (misal: 'foto bareng pacar untuk anniversary'), dan AI kami akan merekomendasikan paket yang paling pas untukmu." },
    ],
    default: [
        { question: "Bagaimana cara booking?", answer: "Gampang banget! Kamu bisa klik tombol 'Booking Sekarang' atau 'Lihat Paket' di website, lalu ikuti langkah-langkahnya." },
        { question: "Lokasinya di mana?", answer: "Kami berada di Jl. Banjar - Pangandaran, tepat di depan SMK 4 Banjar, Pataruman, Kota Banjar." },
        { question: "Ada paket apa saja?", answer: "Kami punya banyak pilihan, dari Self Photo, Couple Session, Grup, sampai paket Yearbook. Cek halaman 'Paket' untuk detail lengkapnya ya!" },
        { question: "Apakah bisa reschedule?", answer: "Bisa! Kamu bisa ajukan reschedule maksimal 7 hari (H-7) sebelum jadwal sesi melalui halaman 'Cek Status' menggunakan kode booking kamu." },
    ]
};
