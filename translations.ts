export const tr = {
    common: {
        loading: 'Yükleniyor...',
        cancel: 'İptal',
        ok: 'Tamam',
        error: 'Hata',
        success: 'Başarılı',
        warning: 'Uyarı',
        info: 'Bilgi',
        save: 'Kaydet',
        delete: 'Sil',
        back: 'Geri',
        min: 'dk', // [YENİ]
        sec: 'sn'  // [YENİ]
    },
    // ... (auth, map kısımları aynı)
    map: {
        title: 'Harita',
        startRun: 'KOŞUYA BAŞLA',
        stopSave: 'DURDUR & KAYDET',
        saving: 'KAYDEDİLİYOR...',
        bgTracking: '📍 Arka plan takibi aktif',
        conquered: 'Bölge Fethedildi!',
        conqueredMsg: 'Mesafe: {distance} KM\nPuan: {score}',
        gaspMsg: 'Ek olarak {count} adet rakip bölgeyi ele geçirdin!',
        shieldActive: 'Bölge Korunuyor!',
        shieldMsg: 'Bu bölge 24 saat boyunca kimse tarafından gasp edilemez. 🛡️',
        shareTitle: 'Paylaş',
        shareMsg: 'Rotanı arkadaşlarınla paylaşmak ister misin?',
        shareBtn: 'Paylaş 📸',
        noShare: 'Hayır',
        locationPermTitle: 'Konum İzni',
        locationPermMsg: 'Haritayı kullanmak için konum izni vermelisiniz.',
        gpsError: 'Yeterli GPS verisi toplanamadı.',
        tooShort: 'Çok Kısa',
        tooShortMsg: 'Minimum rota uzunluğu {min} metredir.',
        dailyQuests: 'Günlük Görevler'
    },
    profile: {
        title: 'Profil',
        totalKm: 'Toplam KM',
        conquests: 'Fetihler',
        points: 'Puan',
        settings: 'Profil Ayarları',
        username: 'Kullanıcı Adı',
        update: 'Güncelle',
        resetPass: 'Şifre Sıfırla',
        privacyZone: 'Ev Konumu Ayarla (Gizlilik)',
        privacyMsg: 'Mevcut konumunuzu "Ev" olarak ayarlamak istiyor musunuz? 200m çapındaki alan gizlenecektir.',
        logout: 'Çıkış Yap',
        deleteAccount: 'Hesabımı Sil',
        deleteConfirm: 'Hesabınızı ve tüm verilerinizi kalıcı olarak silmek istediğinize emin misiniz?',
        changePhoto: 'Profil Fotoğrafı',
        photoMethod: 'Fotoğraf yüklemek için bir yöntem seçin:',
        camera: 'Kamera',
        gallery: 'Galeri',
        routeHistory: 'Geçmiş Koşularım',
        achievements: 'Başarımlarım'
    },
    // ... (social, shop kısımları aynı)
    social: {
        title: 'Sosyal',
        subtitle: 'Arkadaşlarınla Yarış',
        friends: 'Arkadaşlarım',
        requests: 'İstekler',
        searchPlaceholder: 'Kullanıcı adı ara...',
        addFriend: 'Arkadaş Ekle',
        friendRequestSent: 'Arkadaşlık isteği gönderildi!',
        alreadyFriends: 'Zaten arkadaşsınız.',
        requestPending: 'İstek zaten gönderilmiş.',
        accept: 'Kabul Et',
        chatStart: 'Sohbet başladı!',
        newMsg: 'Yeni Mesaj 💬',
        score: 'Puan',
        requestSent: 'İstek Gönderildi',
        youAreFriends: 'Arkadaşsınız',
        friendReqTitle: 'Arkadaşlık İsteği',
        noFriends: 'Henüz arkadaşın yok.',
        noRequests: 'Yeni istek yok.'
    },
    shop: {
        title: 'Market',
        subtitle: 'Gücüne Güç Kat',
        boosters: 'Güçlendirmeler',
        colors: 'Rota Renkleri',
        colorsSubtitle: 'Haritada tarzını konuştur',
        buy: 'SATIN AL',
        active: 'AKTİF',
        use: 'KULLAN',
        owned: 'Satın Alındı',
        inUse: 'Kullanımda',
        insufficientFunds: 'Yetersiz Puan',
        insufficientFundsMsg: 'Bu ürünü almak için daha fazla koşmalısın!',
        stock: 'Stok',
        items: {
            shield: 'Alan Kalkanı',
            shieldDesc: 'Bölgelerini 24 saat korur',
            potion: 'x2 Puan İksiri',
            potionDesc: 'Sonraki koşuda puanı katlar',
            gold: 'Altın Rota',
            neon: 'Neon Yeşil',
            purple: 'Asil Mor',
            fire: 'Alev Kırmızı',
            ocean: 'Okyanus Mavisi',
            pink: 'Şeker Pembe'
        }
    },
    leaderboard: {
        title: 'Liderlik Tablosu',
        subtitle: 'Bölgenin Fatihleri',
        weekly: 'Bu Hafta',
        allTime: 'Tüm Zamanlar',
        emptyWeekly: 'Bu hafta henüz kimse puan kazanmadı.',
        emptyAllTime: 'Henüz veri yok'
    },
    league: {
        bronze: 'Bronz Ligi',
        silver: 'Gümüş Ligi',
        gold: 'Altın Ligi',
        diamond: 'Elmas Ligi'
    },
    quests: {
        distance: 'Toplam {{target}} km koş',
        time: 'Toplam {{target}} dakika koş',
        score: 'Koşulardan {{target}} puan topla',
        conquer: 'Toplam {{target}} bölge fethet'
    },
    routeHistory: {
        title: 'Geçmiş Koşular',
        empty: 'Henüz hiç koşu yapmadın.',
        emptySub: 'İlk rotanı kaydetmek için Harita sekmesine git!',
        km: 'km',
        time: 'süre',
        cal: 'kcal'
    },
    achievements: {
        title: 'Başarımlar',
        subtitle: 'Kilitleri aç, rozetleri topla!',
        badges: {
            first_step: { name: 'İlk Adım', desc: 'İlk rotanı kaydet' },
            explorer: { name: 'Kaşif', desc: '5 fetih yap' },
            marathoner: { name: 'Maratoncu', desc: 'Toplam 42km koş' },
            conqueror: { name: 'Fatih', desc: '1000 puan topla' }
        }
    }
};

export const en = {
    common: {
        loading: 'Loading...',
        cancel: 'Cancel',
        ok: 'OK',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Info',
        save: 'Save',
        delete: 'Delete',
        back: 'Back',
        min: 'min', // [YENİ]
        sec: 'sec'  // [YENİ]
    },
    // ... (auth, map kısımları aynı)
    auth: {
        loginTitle: 'Login',
        registerTitle: 'Register',
        emailPlaceholder: 'Email Address',
        passwordPlaceholder: 'Password',
        loginButton: 'LOGIN',
        registerButton: 'REGISTER',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        registerLink: 'Sign Up',
        loginLink: 'Login',
        guestLogin: 'Login Required',
        guestMessage: 'Please login to continue.',
        welcomeTitle: 'Region Conqueror',
        welcomeSubtitle: 'Ready to Conquer the City?',
        terms: 'Terms of Use',
        privacy: 'Privacy Policy',
        agreement: 'By registering, you agree to our {terms} and {privacy}.'
    },
    map: {
        title: 'Map',
        startRun: 'START RUN',
        stopSave: 'STOP & SAVE',
        saving: 'SAVING...',
        bgTracking: '📍 Background tracking active',
        conquered: 'Region Conquered!',
        conqueredMsg: 'Distance: {distance} KM\nScore: {score}',
        gaspMsg: 'You also captured {count} rival regions!',
        shieldActive: 'Region Protected!',
        shieldMsg: 'This region cannot be captured for 24 hours. 🛡️',
        shareTitle: 'Share',
        shareMsg: 'Do you want to share your route with friends?',
        shareBtn: 'Share 📸',
        noShare: 'No',
        locationPermTitle: 'Location Permission',
        locationPermMsg: 'You must grant location permission to use the map.',
        gpsError: 'Insufficient GPS data collected.',
        tooShort: 'Too Short',
        tooShortMsg: 'Minimum route length is {min} meters.',
        dailyQuests: 'Daily Quests'
    },
    profile: {
        title: 'Profile',
        totalKm: 'Total KM',
        conquests: 'Conquests',
        points: 'Points',
        settings: 'Profile Settings',
        username: 'Username',
        update: 'Update',
        resetPass: 'Reset Password',
        privacyZone: 'Set Home Location (Privacy)',
        privacyMsg: 'Do you want to set your current location as "Home"? Activity within 200m will be hidden.',
        logout: 'Logout',
        deleteAccount: 'Delete My Account',
        deleteConfirm: 'Are you sure you want to permanently delete your account and all data?',
        changePhoto: 'Profile Photo',
        photoMethod: 'Choose a method to upload photo:',
        camera: 'Camera',
        gallery: 'Gallery',
        routeHistory: 'Run History',
        achievements: 'Achievements'
    },
    // ... (social, shop kısımları aynı)
    social: {
        title: 'Social',
        subtitle: 'Compete with Friends',
        friends: 'Friends',
        requests: 'Requests',
        searchPlaceholder: 'Search username...',
        addFriend: 'Add Friend',
        friendRequestSent: 'Friend request sent!',
        alreadyFriends: 'You are already friends.',
        requestPending: 'Request already sent.',
        accept: 'Accept',
        chatStart: 'Chat started!',
        newMsg: 'New Message 💬',
        score: 'Score',
        requestSent: 'Request Sent',
        youAreFriends: 'Friends',
        friendReqTitle: 'Friend Request',
        noFriends: 'No friends yet.',
        noRequests: 'No new requests.'
    },
    shop: {
        title: 'Shop',
        subtitle: 'Power Up',
        boosters: 'Boosters',
        colors: 'Route Colors',
        colorsSubtitle: 'Show your style on the map',
        buy: 'BUY',
        active: 'ACTIVE',
        use: 'USE',
        owned: 'Purchased',
        inUse: 'In Use',
        insufficientFunds: 'Insufficient Points',
        insufficientFundsMsg: 'You need to run more to buy this!',
        stock: 'Stock',
        items: {
            shield: 'Area Shield',
            shieldDesc: 'Protects regions for 24h',
            potion: 'x2 Score Potion',
            potionDesc: 'Doubles score for next run',
            gold: 'Gold Route',
            neon: 'Neon Green',
            purple: 'Noble Purple',
            fire: 'Fire Red',
            ocean: 'Ocean Blue',
            pink: 'Candy Pink'
        }
    },
    leaderboard: {
        title: 'Leaderboard',
        subtitle: 'Conquerors of the Region',
        weekly: 'This Week',
        allTime: 'All Time',
        emptyWeekly: 'No points earned this week yet.',
        emptyAllTime: 'No data yet'
    },
    league: {
        bronze: 'Bronze League',
        silver: 'Silver League',
        gold: 'Gold League',
        diamond: 'Diamond League'
    },
    quests: {
        distance: 'Run {{target}} km in total',
        time: 'Run {{target}} minutes in total',
        score: 'Collect {{target}} points from runs',
        conquer: 'Conquer {{target}} regions'
    },
    routeHistory: {
        title: 'Run History',
        empty: 'You haven\'t run yet.',
        emptySub: 'Go to the Map tab to save your first route!',
        km: 'km',
        time: 'time',
        cal: 'kcal'
    },
    achievements: {
        title: 'Achievements',
        subtitle: 'Unlock locks, collect badges!',
        badges: {
            first_step: { name: 'First Step', desc: 'Save your first route' },
            explorer: { name: 'Explorer', desc: 'Make 5 conquests' },
            marathoner: { name: 'Marathoner', desc: 'Run 42km in total' },
            conqueror: { name: 'Conqueror', desc: 'Collect 1000 points' }
        }
    }
};