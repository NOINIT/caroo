// Teksten van de wachtlijstpagina, het formulier en de bevestigingsmail, in de drie talen van de website.
// Engels en Turks volgen de woorden van /en en /tr (waiting list, founder price; bekleme listesi, kurucu fiyatı).
export type WlTaal = 'nl' | 'en' | 'tr'
export const wlTaal = (x: unknown): WlTaal => (x === 'en' || x === 'tr' ? x : 'nl')

type Teksten = {
  lang: string; titel: string; omschrijving: string; logoLabel: string; open: string
  plekken: (n: number) => string; kop: string; intro: string
  prijs: (n: number, prijs: string, normaal: string) => [string, string, string]
  familieKop: string; familie: string[]; hoofdKop: string; hoofd: string[]
  wetenKop: string; weten: [string, string][]; initiatief: string; privacy: string
  form: {
    kop: string; naam: string; email: string; voorWie: string; overslaan: string
    keuzes: Record<'moeder' | 'vader' | 'opa_oma' | 'partner' | 'mezelf' | 'anders', string>
    updates: string; bezig: string; knop: string; uitleg: string; privacyLink: string
    alErop: string; erop: string; bijgewerkt: string; gemaild: string; lancering: string
    foutNaam: string; foutEmail: string; foutAlgemeen: string
  }
  mail: { onderwerp: string; kop: (v: string) => string; p1: string; p2: (n: number, prijs: string, normaal: string) => string; p3: string; groet: string; initiatief: string }
}

export const WL: Record<WlTaal, Teksten> = {
  nl: {
    lang: 'nl', titel: 'Wachtlijst', omschrijving: 'Word een van de eerste 100 oprichtersfamilies van Clanoo.', logoLabel: 'Naar de startpagina van Clanoo', open: 'Open in 2027',
    plekken: n => `Nog ${n} oprichtersplekken`,
    kop: 'Zorg voor elkaar, samen georganiseerd.',
    intro: 'Clanoo brengt de familie samen rond de persoon om wie het draait. Afspraken, medicijnen, boodschappen en wie er wanneer langskomt staan op één plek. En de persoon om wie het gaat, doet zelf mee.',
    prijs: (n, p, nm) => [`De eerste ${n} families worden oprichtersfamilie en betalen `, `${p} voor het eerste jaar`, ` in plaats van ${nm}.`],
    familieKop: 'Voor de familie',
    familie: ['Eén agenda voor afspraken bij de huisarts, het ziekenhuis of de kapper', 'Taken verdelen, zodat niet alles op één persoon neerkomt', 'Een gedeelde boodschappenlijst die iedereen kan aanvullen', 'Medicijnen op een rij, met wie wat wanneer geeft'],
    hoofdKop: 'Voor de hoofdpersoon',
    hoofd: ['Grote letters en grote knoppen, zonder wachtwoord inloggen', 'Elke dag laten weten hoe het gaat, met één tik op een smiley', 'Zelf om bezoek vragen, en zien wie er komt en wanneer', 'Foto’s van de familie en eigen verhalen inspreken'],
    wetenKop: 'Goed om te weten',
    weten: [
      ['Wat kost het?', 'Je begint met een gratis maand. Als oprichtersfamilie betaal je daarna €69 voor het eerste jaar, en vanaf het tweede jaar €125 per jaar. Dat is per familie: iedereen die je uitnodigt doet mee zonder extra kosten. Opzeggen kan altijd; je houdt Clanoo tot het einde van het jaar.'],
      ['Zit ik ergens aan vast?', 'Nee. De wachtlijst is vrijblijvend. Bij de lancering krijg je een mail en beslis je of je je plek neemt.'],
      ['Wat gebeurt er met onze gegevens?', 'Alles staat op servers in Europa en is alleen zichtbaar voor de mensen in jullie eigen groep. We verkopen nooit gegevens.'],
    ],
    initiatief: 'Clanoo is een initiatief van NOINIT, Dordrecht', privacy: 'Privacy',
    form: {
      kop: 'Zet me op de wachtlijst', naam: 'Je naam', email: 'E-mailadres', voorWie: 'Voor wie zoek je dit?', overslaan: '(mag je overslaan)',
      keuzes: { moeder: 'Mijn moeder', vader: 'Mijn vader', opa_oma: 'Opa of oma', partner: 'Mijn partner', mezelf: 'Voor mezelf', anders: 'Iemand anders' },
      updates: 'Stuur me ook af en toe nieuws over Clanoo. Afmelden kan altijd.', bezig: 'Even geduld...', knop: 'Zet me op de wachtlijst',
      uitleg: 'We gebruiken je gegevens alleen voor de wachtlijst en, als je dat aanvinkt, voor nieuws over Clanoo.', privacyLink: 'Lees de privacyverklaring',
      alErop: 'Je stond er al op', erop: 'Je staat erop', bijgewerkt: 'We hebben je gegevens bijgewerkt.', gemaild: 'We hebben je een bevestiging gemaild. Kijk ook even bij ongewenste mail.', lancering: 'Bij de lancering hoor je als eerste van ons.',
      foutNaam: 'Vul je naam in.', foutEmail: 'Dit e-mailadres klopt niet helemaal.', foutAlgemeen: 'Aanmelden lukte niet. Probeer het zo nog eens.',
    },
    mail: {
      onderwerp: 'Je staat op de wachtlijst van Clanoo', kop: v => `Fijn dat je erbij bent, ${v}`,
      p1: 'Je staat op de wachtlijst van Clanoo. Zodra we opengaan, hoor je het als eerste.',
      p2: (n, p, nm) => `De eerste ${n} families worden oprichtersfamilie. Zij betalen ${p} voor het eerste jaar in plaats van ${nm}. Bij de lancering krijg je een mail met een link om je plek te nemen. Aanmelden voor de wachtlijst is vrijblijvend.`,
      p3: 'Vragen of ideeën? Antwoord gewoon op deze mail.', groet: 'Hartelijke groet,', initiatief: 'Clanoo is een initiatief van NOINIT, Dordrecht',
    },
  },
  en: {
    lang: 'en', titel: 'Waiting list', omschrijving: 'Become one of the first 100 founding families of Clanoo.', logoLabel: 'To the Clanoo home page', open: 'Opening in 2027',
    plekken: n => `${n} founding family places`,
    kop: 'Caring for each other, organised together.',
    intro: 'Clanoo brings the family together around the person it is all about. Appointments, medicines, shopping and who visits when are all in one place. And the person it is about takes part too.',
    prijs: (n, p, nm) => [`The first ${n} families become founding families and pay `, `${p} for the first year`, ` instead of ${nm}.`],
    familieKop: 'For the family',
    familie: ['One calendar for appointments with the GP, the hospital or the hairdresser', 'Share out tasks, so not everything falls on one person', 'A shared shopping list that everyone can add to', 'Medicines at a glance, with who gives what and when'],
    hoofdKop: 'For the main person',
    hoofd: ['Large letters and large buttons, logging in without a password', 'Let the family know how you are each day, with one tap on a smiley', 'Ask for a visit yourself, and see who is coming and when', 'Family photos, and recording your own stories'],
    wetenKop: 'Good to know',
    weten: [
      ['What does it cost?', 'You start with a free month. As a founding family you then pay €69 for the first year, and €125 a year from the second year. That is per family: everyone you invite joins at no extra cost. You can cancel at any time and keep Clanoo until the end of the year.'],
      ['Am I committing to anything?', 'No. The waiting list is free and without obligation. At launch you get an email and decide whether to take your place.'],
      ['What happens to our data?', 'Everything is stored on servers in Europe and is only visible to the people in your own group. We never sell data.'],
    ],
    initiatief: 'Clanoo is an initiative of NOINIT, Dordrecht', privacy: 'Privacy (in Dutch)',
    form: {
      kop: 'Put me on the waiting list', naam: 'Your name', email: 'Email address', voorWie: 'Who is this for?', overslaan: '(optional)',
      keuzes: { moeder: 'My mother', vader: 'My father', opa_oma: 'A grandparent', partner: 'My partner', mezelf: 'For myself', anders: 'Someone else' },
      updates: 'Also send me occasional news about Clanoo. You can unsubscribe at any time.', bezig: 'One moment...', knop: 'Put me on the waiting list',
      uitleg: 'We only use your details for the waiting list and, if you tick the box, for news about Clanoo.', privacyLink: 'Read the privacy statement (in Dutch)',
      alErop: 'You were already on it', erop: 'You’re on the list', bijgewerkt: 'We have updated your details.', gemaild: 'We have emailed you a confirmation. Please check your spam folder too.', lancering: 'You will be the first to hear from us at launch.',
      foutNaam: 'Please enter your name.', foutEmail: 'This email address doesn’t look quite right.', foutAlgemeen: 'Signing up didn’t work. Please try again in a moment.',
    },
    mail: {
      onderwerp: 'You’re on the Clanoo waiting list', kop: v => `Great to have you, ${v}`,
      p1: 'You are on the Clanoo waiting list. As soon as we open, you will be the first to know.',
      p2: (n, p, nm) => `The first ${n} families become founding families. They pay ${p} for the first year instead of ${nm}. At launch you will get an email with a link to take your place. Joining the waiting list is without obligation.`,
      p3: 'Questions or ideas? Just reply to this email.', groet: 'Kind regards,', initiatief: 'Clanoo is an initiative of NOINIT, Dordrecht',
    },
  },
  tr: {
    lang: 'tr', titel: 'Bekleme listesi', omschrijving: 'Clanoo’nun ilk 100 kurucu ailesinden biri ol.', logoLabel: 'Clanoo ana sayfasına git', open: '2027’de açılıyor',
    plekken: n => `${n} kurucu aile yeri`,
    kop: 'Birbirimize bakalım, birlikte ve düzenli.',
    intro: 'Clanoo, aileyi her şeyin etrafında döndüğü kişinin çevresinde bir araya getirir. Randevular, ilaçlar, alışveriş ve kimin ne zaman ziyarete geleceği tek bir yerde. Ve söz konusu kişi de kendisi katılır.',
    prijs: (n, p, nm) => [`İlk ${n} aile kurucu aile olur ve `, `ilk yıl için ${p}`, ` öder, ${nm} yerine.`],
    familieKop: 'Aile için',
    familie: ['Aile hekimi, hastane veya kuaför randevuları için tek bir takvim', 'Görevleri paylaşın, böylece her şey tek bir kişinin üzerine kalmaz', 'Herkesin ekleyebileceği ortak bir alışveriş listesi', 'İlaçlar bir arada: kim neyi ne zaman veriyor'],
    hoofdKop: 'Ana kişi için',
    hoofd: ['Büyük harfler ve büyük düğmeler, şifresiz giriş', 'Her gün tek dokunuşla bir yüz ifadesi seçerek nasıl olduğunu bildirmek', 'Ziyareti kendisi istemek, kimin ne zaman geleceğini görmek', 'Aile fotoğrafları ve kendi hikâyelerini sesli kaydetmek'],
    wetenKop: 'Bilmekte fayda var',
    weten: [
      ['Ne kadar tutar?', 'Ücretsiz bir ayla başlarsın. Kurucu aile olarak sonra ilk yıl için 69 €, ikinci yıldan itibaren yılda 125 € ödersin. Bu fiyat aile başınadır: davet ettiğin herkes ek ücret olmadan katılır. İstediğin zaman iptal edebilirsin; Clanoo yıl sonuna kadar seninle kalır.'],
      ['Bir yükümlülüğe giriyor muyum?', 'Hayır. Bekleme listesi bağlayıcı değildir. Açılışta bir e-posta alırsın ve yerini alıp almayacağına sen karar verirsin.'],
      ['Verilerimize ne olur?', 'Her şey Avrupa’daki sunucularda saklanır ve sadece kendi grubunuzdaki kişiler görebilir. Verileri asla satmayız.'],
    ],
    initiatief: 'Clanoo, Dordrecht’teki NOINIT’in bir girişimidir', privacy: 'Gizlilik (Felemenkçe)',
    form: {
      kop: 'Beni bekleme listesine ekle', naam: 'Adın', email: 'E-posta adresi', voorWie: 'Kimin için arıyorsun?', overslaan: '(isteğe bağlı)',
      keuzes: { moeder: 'Annem', vader: 'Babam', opa_oma: 'Dedem veya ninem', partner: 'Eşim', mezelf: 'Kendim için', anders: 'Başka biri' },
      updates: 'Bana ara sıra Clanoo hakkında haber de gönder. İstediğim zaman çıkabilirim.', bezig: 'Bir saniye...', knop: 'Beni bekleme listesine ekle',
      uitleg: 'Bilgilerini sadece bekleme listesi için ve işaretlersen Clanoo haberleri için kullanırız.', privacyLink: 'Gizlilik bildirimini oku (Felemenkçe)',
      alErop: 'Zaten listedeydin', erop: 'Listedesin', bijgewerkt: 'Bilgilerini güncelledik.', gemaild: 'Sana bir onay e-postası gönderdik. İstenmeyen e-postalara da bak.', lancering: 'Açılışta ilk sen haber alacaksın.',
      foutNaam: 'Lütfen adını yaz.', foutEmail: 'Bu e-posta adresi tam doğru görünmüyor.', foutAlgemeen: 'Kayıt olmadı. Lütfen birazdan tekrar dene.',
    },
    mail: {
      onderwerp: 'Clanoo bekleme listesindesin', kop: v => `Aramızda olmana sevindik, ${v}`,
      p1: 'Clanoo bekleme listesindesin. Açılır açılmaz ilk sen haber alacaksın.',
      p2: (n, p, nm) => `İlk ${n} aile kurucu aile olur. İlk yıl için ${nm} yerine ${p} öderler. Açılışta yerini alman için bir bağlantı içeren bir e-posta alacaksın. Bekleme listesine katılmak bağlayıcı değildir.`,
      p3: 'Soruların veya fikirlerin mi var? Bu e-postayı yanıtlaman yeterli.', groet: 'Sevgiler,', initiatief: 'Clanoo, Dordrecht’teki NOINIT’in bir girişimidir',
    },
  },
}
