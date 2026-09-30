/**
 * MSK Labs - Bizce & Anıltılar Platform Engine
 * Dynamic post rendering, filtering, language switching, and Text-to-Speech (TTS)
 */
var currentLang = 'tr';
var currentSection = 'bizce'; // 'bizce' or 'anilts'
var currentSubFilter = 'all';
var currentPost = null;
var synth = window.speechSynthesis;
var currentUtterance = null;

var blogPostsData = [
  {
    "id": 1,
    "type": "bizce",
    "category": "Manifesto & İlk Makale",
    "category_en": "Manifesto & First Article",
    "category_ar": "البيان والمقال الأول",
    "date": "29 Eylül 2026",
    "readTime": "6 dk okuma",
    "icon": "💡",
    "tr": {
      "title": "BİZCE Nedir? — Sessiz Kalabalığın Sesi ve Başka Bir Pencere",
      "summary": "Herkesin söyleyecek bir sözü var. Bizim de var. BİZCE, insanı ve insanlığı ilgilendiren meseleleri kendi anlayışımız, değerlerimiz ve düşünce biçimimiz içerisinde yeniden ele almak için var.",
      "content": "<p class=\"lead\">Herkesin söyleyecek bir sözü var. Bizim de var. Dünyada yaşanan olaylar, ortaya atılan fikirler, toplumların yaşadığı sorunlar ve insan davranışları hakkında her gün binlerce yazı yazılıyor, binlerce yorum yapılıyor. Fakat bazen bütün bu seslerin arasında başka bir sesin eksik veya kısık kaldığını düşünüyoruz. Bizim gördüğümüz, düşündüğümüz ve doğru olduğuna inandığımız şeyleri söyleyen bir ses... <strong>BİZCE</strong>, işte bu düşünceden doğdu.</p><p><strong>MSK Labs</strong> ekibi olarak birçok konuda yapılan yorumların, ortaya konulan fikirlerin ve olaylara getirilen bakışların tamamına katılmıyoruz. Bu nedenle insanı ve insanlığı ilgilendiren meseleleri kendi anlayışımız, değerlerimiz ve düşünce biçimimiz içerisinde yeniden ele almak istiyoruz. BİZCE'nin amacı yalnızca bir olay hakkında fikir söylemek değildir. Olayın kendisini anlamaya, doğru ile yanlışı birbirinden ayırmaya ve okuyucuya başka bir pencereden bakma imkânı sunmaya çalışmaktır.</p><h3>BİZCE Neden Var?</h3><p>Herkesin söyleyecek bir sözü var. Biz de bu dünyanın içerisinde yaşayan insanlarız. Bizim de düşüncelerimiz, gördüklerimiz, yaşadıklarımız ve üzerinde konuşulması gerektiğine inandığımız meseleler var. Fakat bazen toplum içerisinde çok büyük bir kalabalığın düşünceleri yeterince duyulmuyor. Söylemek isteyen ama söyleyemeyen, düşüncesini ifade edemeyen veya sesi diğer seslerin arasında kaybolan insanların da bulunduğuna inanıyoruz. <strong>BİZCE, mümkün olduğunca bu sessiz kalabalığın sesi olmayı amaçlıyor.</strong></p><p><strong>Hakkı, adaleti, doğruyu ve olması gerekeni</strong> kendi anlayışımız içerisinde dile getirmek; insanların önüne yeniden koymak ve üzerinde düşünülmesini sağlamak istiyoruz. Bunu yaparken kimsenin adına konuştuğumuzu iddia etmiyoruz. Sadece bizim gördüğümüz, düşündüğümüz ve ifade edilmesi gerektiğine inandığımız meseleleri ortaya koyuyoruz.</p><h3>BİZCE'nin Konusu Nedir?</h3><p>BİZCE'nin belirlenmiş bir konu sınırı yok. Çünkü insanın olduğu yerde konuşulacak, düşünülecek ve tartışılacak çok fazla şey var. Toplumsal olaylar, insan davranışları, ahlak, adalet, bilim, teknoloji, eğitim, ekonomi, tarih, gelecek, fikirler, kavramlar, kuramlar ve insan hayatını ilgilendiren daha pek çok konu BİZCE'nin konusu olabilir.</p><p>Bir konu güncel olmak zorunda da değil. Geçmişte yaşanmış bir olay, yıllardır tartışılan bir düşünce, bilimsel veya toplumsal bir mesele ya da geleceğe ilişkin bir yaklaşım da BİZCE'nin konusu olabilir. Çünkü bizim için önemli olan olayın hangi tarihte yaşandığından çok, <strong>insan ve insanlık açısından ne ifade ettiğidir.</strong></p><h3>Başka Bir Pencereden Bakmak</h3><p>BİZCE'nin temel amaçlarından biri okuyucuya başka bir bakış açısı sunabilmek. Bir manzaraya tek bir pencereden baktığınızda yalnızca o pencereden görünen kısmı görürsünüz. Oysa başka bir pencereye geçtiğinizde aynı manzaranın daha önce fark etmediğiniz başka taraflarını görebilirsiniz. Biz BİZCE ile tam olarak bunu yapmaya çalışıyoruz. Okuyucuya ne düşüneceğini dikte etmek yerine, <em>“Bir de buradan bakın.”</em> demek istiyoruz.</p><p>Belki daha önce fark edilmeyen bir ayrıntıyı gösterebiliriz. Belki alışılmış bir düşüncenin başka bir yönünü ortaya çıkarabiliriz. Belki herkesin bildiğini sandığı bir konunun aslında üzerinde yeniden düşünülmesi gerektiğini gösterebiliriz. Son karar yine okuyucunundur. Ama bizim görevimiz, gördüğümüz pencereyi onun da görebileceği şekilde açabilmektir.</p><h3>BİZCE Nasıl Hazırlanıyor?</h3><p>BİZCE yazıları tek bir kişinin kişisel düşüncesinden ibaret olmamaya çalışır. MSK Labs ekibi uzaktan çalışan ve farklı alanlarda katkı sağlayan kişilerden oluştuğu için bütün ekibi aynı anda bir araya getirmek her zaman mümkün değildir. Bu nedenle üzerinde çalışılacak konu için ekip içerisinden bir kişi görevlendirilir. Bu kişi konu üzerinde araştırma yapar, düşünür ve ilk çalışmasını hazırlar. Çalışma yazılı bir metin olarak veya gerektiğinde sesli olarak diğer ekip üyeleriyle paylaşılır.</p><p>Ardından ekip içerisinde metin incelenir. Eksikler, farklı düşünceler, eleştiriler ve eklenmesi gereken noktalar değerlendirilir. Bu süreç mümkün olduğunca devam ettirilerek ortaya ortak bir düşünce ve değerlendirme ürünü olan BİZCE makalesi çıkarılmaya çalışılır. Dolayısıyla BİZCE'deki <strong>“biz”</strong>, yalnızca bir isim değildir. <strong>Mümkün olduğunca birlikte düşünmenin ve istişare etmenin ifadesidir.</strong></p><h3>İslami Yaklaşımımız</h3><p>BİZCE'nin temelinde İslami yaklaşım bulunur. Biz İslam'ın insan hayatı için en doğru, en ahlaki, en adil ve en yaşanabilir hayat anlayışını ortaya koyduğuna inanıyoruz. Bu nedenle insanlara, topluma, ahlaka, adalete ve yaşanan olaylara bakışımızda <strong>İslami değerler mümkün olduğunca tek temel referansımızdır.</strong></p><p>Bu yaklaşımımızı gizlemiyoruz. Aksine BİZCE'nin nasıl düşündüğünü anlamak isteyen bir okuyucunun bunu açıkça bilmesini istiyoruz. Elbette herkes bizimle aynı inanca veya düşünceye sahip olmak zorunda değil. Yazılarımızı farklı inançlara veya düşüncelere sahip insanlar da okuyabilir. Bizim görevimiz ise inandığımız doğruyu kendi anlayabildiğimiz ölçüde samimi, açık ve mümkün olduğunca doğru şekilde ifade etmektir.</p><h3>Araştırma, Kaynak ve Yaşanmışlık</h3><p>BİZCE yalnızca kişisel kanaatlerden oluşan bir yazı dizisi olmasını istemediğimiz bir yapı. Bir konuyu ele alırken mümkün olduğunca sağlam kaynaklardan yararlanmayı, temel kaynakları incelemeyi ve özellikle İslami kaynakları kendi yaklaşımımız içerisinde değerlendirmeyi önemsiyoruz. Bunun yanında yaşanmış olaylar da düşüncelerimizi anlamlandırmamıza yardımcı olabilir. Amacımız yalnızca bir hatayı göstermek değil; mümkün olduğunca hatanın neden ortaya çıktığını, nereye götürdüğünü ve doğru yönün ne olabileceğini ortaya koyabilmektir.</p><h3>BİZCE, GÜNCEL ve ANILTILAR</h3><p>MSK Labs içerisinde bu üç bölümün birbirinden farklı bir görevi vardır:</p><ul><li><strong>BİZCE:</strong> İnsanı ve insanlığı ilgilendiren meseleleri daha geniş bir zaman ve konu perspektifinden ele alır. Geçmiş, gelecek, fikirler, kavramlar, bilim, toplum ve hayatın farklı alanları BİZCE'nin konusu olabilir.</li><li><strong>GÜNCEL:</strong> Yazının hazırlandığı dönemde yaşanan sıcak olaylara odaklanır. Güncel olayın kendisini, MSK Labs'ın bakışını ve olayın görünen kısmının arkasında bulunabilecek unsurları değerlendirmeye çalışır.</li><li><strong>ANILTILAR:</strong> Gerçek hayatta yaşanmış olayları ve tecrübeleri aktarır. İyi bir tecrübeyse örnek olarak, kötü bir tecrübeyse ders olarak ortaya konur.</li></ul><p>Kısaca: <strong>BİZCE düşünür ve yorumlar. GÜNCEL yaşananı sorgular. ANILTILAR yaşanmışlığı anlatır.</strong></p><h3>BİZCE'nin Ulaşmak İstediği Yer</h3><p>BİZCE'nin yalnızca insanların birkaç yazı okuyup geçeceği bir bölüm olmasını istemiyoruz. Okuyucunun bir yazıyı bitirdikten sonra kendi hayatına, çevresine ve dünyaya yeniden bakabilmesini istiyoruz. Adaletin, doğruluğun, güzel yaşantının, insani yaklaşımın ve toplumsal birlikteliğin mümkün olduğunu gösterebilmek istiyoruz.</p><p>İnsanların birbirine zarar vermeden yaşayabileceği, kan ve gözyaşının ortadan kalktığı, insanların güven ve huzur içerisinde yaşayabildiği bir dünyanın mümkün olduğuna inanıyoruz. Biz buna <strong>SELAM ve SAADET YURDU</strong> anlayışıyla bakıyoruz. BİZCE'nin amacı da bu düşüncenin mümkün olduğunca daha fazla insana ulaşmasına katkı sağlamak.</p><p>Belki tek bir makale dünyayı değiştirmeyecek. Belki tek bir düşünce bütün bir toplumu değiştirmeyecek. Ama bir insanın düşünmesine, bir insanın yanlışını fark etmesine, bir insanın başka bir insana daha güzel davranmasına, bir insanın adaleti tercih etmesine vesileabilir. Bazen büyük değişimler, bir insanın yeniden düşünmesiyle başlar.</p><blockquote class=\"manifesto-quote\"><p>“Bir çiçekle bahar olmaz; ama her bahar bir çiçekle başlar.”</p><cite>— Şehit Prof. Dr. Necmettin ERBAKAN</cite></blockquote><p><strong>BİZCE bunun için var.</strong></p>"
    },
    "en": {
      "title": "What is BİZCE? — The Voice of the Silent Crowd & Another Window",
      "summary": "Everyone has something to say. So do we. BİZCE exists to re-examine human affairs through our own understanding, values, and mindset.",
      "content": "<p class=\"lead\">Everyone has something to say. So do we. Thousands of articles and comments are written every day about global events, ideas, social issues, and human behavior. Yet, amid all these voices, we feel a specific voice remains missing or muted: a voice speaking what we see, think, and believe to be right. <strong>BİZCE</strong> was born out of this exact thought.</p><p>As the <strong>MSK Labs</strong> team, we do not agree with all mainstream comments and perspectives. Therefore, we wish to re-examine matters concerning humanity through our own understanding, values, and mindset. The goal of BİZCE is not merely to voice an opinion on an event, but to understand the issue, discern right from wrong, and offer readers a perspective from another window.</p><h3>Why Does BİZCE Exist?</h3><p>Everyone has a voice, and we are part of this world too. But often, the voices of a vast crowd in society go unheard. We believe there are people who want to speak but cannot, or whose voices get lost in the noise. <strong>BİZCE aims to be the voice of this silent crowd.</strong></p><p>We want to express truth, justice, and righteousness as we understand them, laying them before people for quiet reflection. We do not claim to speak on behalf of anyone; we simply put forward issues we believe must be stated.</p><h3>What Is the Scope of BİZCE?</h3><p>BİZCE has no rigid thematic boundaries. Wherever humans exist, there is much to discuss: social dynamics, morality, justice, science, technology, education, economy, history, and future concepts. A topic does not have to be current; historical events, age-old philosophical questions, or future paradigms all belong to BİZCE, because what matters most is <strong>what it signifies for humanity.</strong></p><h3>Looking from Another Window</h3><p>Looking at a landscape through a single window reveals only one view. Stepping to another window unveils hidden dimensions. We do not dictate what you should think; we simply say, <em>“Take a look from here as well.”</em></p><h3>How Is BİZCE Prepared?</h3><p>BİZCE articles are not the solitary opinion of one person. As a remote team at MSK Labs, we assign a member to research and draft an initial piece, which is then reviewed, critiqued, and enriched through consultation. Thus, <strong>“WE”</strong> in BİZCE is not just a title; <strong>it represents collective reflection and consultation (Istishara).</strong></p><h3>Our Islamic Perspective</h3><p>At the core of BİZCE lies an Islamic approach. We believe Islam offers the most just, ethical, and livable way of life. Hence, <strong>Islamic values are our primary reference.</strong> We state this openly. One does not need to share our faith to read BİZCE; our duty is to express the truth sincerely and clearly.</p><h3>Research, Sources, and Experience</h3><p>We ground our analyses in reliable sources, especially Islamic foundational texts, alongside real-life human experiences, aiming not just to highlight errors, but to uncover their roots and point toward righteous paths.</p><h3>BİZCE, GÜNCEL, and ANILTILAR</h3><ul><li><strong>BİZCE:</strong> Thinks and interprets human affairs from a broader perspective.</li><li><strong>GÜNCEL:</strong> Questions ongoing events and uncovers underlying dynamics.</li><li><strong>ANILTILAR:</strong> Narrates real-life experiences as lessons and examples.</li></ul><h3>The Horizon BİZCE Aims to Reach</h3><p>We believe a world of peace, safety, and justice is possible — an ideal we call the <strong>Abode of Peace and Happiness (Selam ve Saadet Yurdu)</strong>.</p><blockquote class=\"manifesto-quote\"><p>“Spring does not come with a single flower, but every spring begins with one.”</p><cite>— Martyr Prof. Dr. Necmettin ERBAKAN</cite></blockquote><p><strong>This is why BİZCE exists.</strong></p>"
    },
    "ar": {
      "title": "ما هو بَيْزَجَه (BİZCE)؟ — صوت الأغلبية الصامتة ونافذة أخرى",
      "summary": "لكل شخص كلمة يريد إيصالها، ونحن كذلك. أنشئت بَيْزَجَه لإعادة تناول القضايا الإنسانية وفق قيمنا ورؤيتنا.",
      "content": "<p class=\"lead\">لكل شخص كلمة يريد إيصالها، ونحن كذلك. يُكتب يومياً آلاف المقالات عن الأحداث العالمية، الأفكار، والتحديات الاجتماعية. ولكننا نشعر أن هناك صوتاً غائباً بين هذه الأصوات. <strong>بَيْزَجَه (BİZCE)</strong> نبعت من هذه الفكرة بالذات.</p><p>فريق <strong>MSK Labs</strong> يسعى لإعادة تناول القضايا الإنسانية وفق قيمنا ورؤيتنا، بهدف تقديم فهم عميق وفتح نافذة جديدة للقارئ.</p><h3>لماذا بَيْزَجَه؟</h3><p>تسعى بَيْزَجَه لتكون <strong>صوت الأغلبية الصامتة</strong> والتعبير عن الحق والعدل بما يسهم في إثراء التفكير السليم.</p><h3>نطاق بَيْزَجَه</h3><p>لا تتحدد بَيْزَجَه بموضوع واحد؛ فكل ما يخص الإنسان من أخلاق، وعدالة، وعلم، وتاريخ ومستقبل هو موضوع لبَيْزَجَه.</p><h3>النظرة الإسلامية</h3><p>تستند بَيْزَجَه إلى <strong>القيم الإسلامية كمرجع أساسي</strong> يضمن العدل والأخلاق في تناول القضايا الإنسانية.</p><blockquote class=\"manifesto-quote\"><p>«لا يأتي الربيع بوردة واحدة، ولكن كل ربيع يبدأ بوردة واحدة.»</p><cite>— الشهيد أ. د. نجم الدين أربكان</cite></blockquote><p><strong>لهذا السبب كُتِبت بَيْزَجَه.</strong></p>"
    }
  },
  {
    "id": 2,
    "type": "anilts",
    "category": "Manifesto & İlk Makale",
    "category_en": "Manifesto & First Article",
    "category_ar": "البيان والمقال الأول",
    "date": "29 Eylül 2026",
    "readTime": "7 dk okuma",
    "icon": "📖",
    "tr": {
      "title": "ANILTILAR Nedir? — Yaşanmışlıklardan İbret, Tecrübelerden Hikmet",
      "summary": "Geçmişin izleri, geleceğin dersleri. ANILTILAR, anıların ve iniltilerin buluştuğu; yaşanmışlıkların tecrübeye, tecrübelerin de derslere dönüştüğü bir alandır.",
      "content": "<p class=\"lead\">Geçmişin izleri, geleceğin dersleri. İnsan yaşar, yaşadıklarından izler taşır ve zaman geçtikçe bazı anılar zihninde yeniden canlanır. Kimi anılar yüzümüzde bir tebessüm oluşturur, kimileri kahkahalarla hatırlanır. Bazılarıysa insanın yüreğinde bir sızı bırakır; hatırlandığında gözleri doldurur, insanı inletir. İşte <strong>ANILTILAR</strong>, anıların ve iniltilerin buluştuğu; yaşanmışlıkların tecrübeye, tecrübelerin de derslere dönüştüğü bir alandır.</p><p>Hayat yalnızca güzel hatıralardan ibaret değildir. Haksızlıklar, yanlış kararlar, ihmal edilen sorumluluklar, kırılan gönüller ve yaşanan acılar da hayatın bir parçasıdır. Gönlümüz güzel örnekleri anlatmaktan yana olsa da yaşadıklarımız bize bazen yanlışların, haksızlıkların ve ibretlik olayların daha fazla konuşulması gerektiğini gösterir. Çünkü bazı hatalar ancak yaşandıktan sonra anlaşılır; bazı gerçekler ise insanın başına gelmeden yeterince fark edilmez.</p><p>ANILTILAR, geçmişte yaşananları yalnızca hatırlamak veya anlatmak için oluşturulmadı. Asıl amaç, yaşanmış olaylardan doğru dersler çıkarmak, benzer yanlışların tekrar edilmesini önlemek ve daha insanca bir hayatın mümkün olmasına katkı sağlamaktır.</p><h3>ANILTILAR Neden Var?</h3><p>Bir olayın yaşanmış olması, ondan mutlaka ders çıkarıldığı anlamına gelmez. İnsan aynı hatayı tekrar edebilir, gördüğü haksızlığa sessiz kalabilir veya başkasının yaşadığı acıdan kendisine düşen payı alamayabilir. Oysa tecrübenin gerçek değeri, insanı düşünmeye ve davranışlarını düzeltmeye yöneltebilmesindedir.</p><p>ANILTILAR, tam da bu noktada devreye girer. Yaşadıklarımızı aktarırken yalnızca <em>“Ne oldu?”</em> sorusunu değil, <em>“Neden böyle oldu, nerede yanlış yapıldı, nasıl davranılmalıydı ve bundan sonra ne yapılmalı?”</em> sorularını da sorarız.</p><p>Amacımız geçmişte yaşananları tekrar tekrar gündeme getirmek, insanları suçlamak veya kırgınlıkları canlı tutmak değildir. Amacımız, yaşanmışlıklardan hareketle <strong>daha doğru davranışların yolunu aramak ve aynı yanlışların yeniden yaşanmasının önüne geçmektir.</strong></p><h3>Yaşanmış Olaylar, Gerçek Tecrübeler</h3><p>ANILTILAR'ın temelini, öncelikle ekip üyelerimizin bizzat yaşadığı olaylar oluşturacaktır. Bunun yanında, güvenilir kaynaklarda anlatılan veya başkalarının yaşadığı, tecrübe aktarımı bakımından anlam taşıyan olaylara da yer verilebilecektir.</p><p>Burada esas olan, olayın yalnızca ilgi çekici olması değildir. Anlatılan yaşanmışlığın okuyucuya bir şey kazandırması, üzerinde düşünmeye değer bir yön taşıması ve hayata dair bir ders sunması beklenir.</p><p>Anlatım, mümkün olduğunca olayı yaşayan veya gözlemleyen kişinin gördüklerine ve hatırladıklarına dayanacaktır. Gereksiz eklemelerle olayın özünü değiştirmek yerine, yaşanmışlığın anlaşılır bir dille aktarılması tercih edilecektir. Bununla birlikte, kişisel hatıraların anlatıcının bakış açısını ve hatırlama biçimini taşıyabileceği de göz önünde bulundurulmalıdır.</p><p>Her yazının sonunda, <strong>yaşananlardan çıkarılabilecek derslere, yapılmaması gerekenlere ve mümkünse izlenmesi gereken doğru yola</strong> yer verilecektir. Böylece okuyucu, anlatılanları okuduktan sonra <em>“Peki, bundan ne anlamalıyım?”</em> sorusuyla baş başa kalmayacaktır.</p><h3>Karanlığın İçindeki Aydınlığı Aramak</h3><p>ANILTILAR'da hatalar, haksızlıklar ve acı tecrübeler anlatılabilir. Ancak bir olayın karanlık yönünü göstermek tek başına yeterli değildir. O karanlığın içinden çıkarılabilecek bir ders, düzeltilebilecek bir yanlış veya geleceğe ışık tutabilecek bir yaklaşım da aranmalıdır.</p><p>Bazen yaşanan olayın içinde olumlu bir sonuç bulunmayabilir. Böyle durumlarda, olması gereken davranış birkaç cümleyle açıklanabilir; olayın nasıl daha doğru yönetilebileceği konusunda bir tavsiye sunulabilir. Çünkü yalnızca yanlışın anlatılması, okuyucunun önüne her zaman bir çözüm koymaz.</p><p><strong>Her karanlığın içinde bir aydınlık aramak, aydınlık bulunamadığında ise ona giden yolu göstermek istiyoruz.</strong></p><p>Bu yaklaşım, yaşanan acıları küçümsemek veya her olumsuzluğun mutlaka güzel bir sonuç doğurduğunu ileri sürmek değildir. Amaç, yaşananların boşa gitmemesi ve bir başkasının aynı acıyı yaşamaması için mümkün olan dersi ortaya çıkarmaktır.</p><h3>İslami Bakış Açısıyla Değerlendirme</h3><p>ANILTILAR'ın olaylara yaklaşımının temelinde <strong>İslami ölçüler</strong> yer alacaktır. Hak, adalet, özgürlük, mahremiyet, sorumluluk, merhamet ve insan onuru gibi konular; yaşanmış olaylardan çıkarılacak derslerle birlikte ele alınacaktır.</p><p>Burada bir davranışın eleştirilmesi, yalnızca bizi rahatsız etmesine veya bize zarar vermesine bağlı değildir. Esas mesele, davranışın hak ve adalet ölçüleriyle, İslami ilkelerle ne ölçüde örtüştüğüdür. Özellikle Müslüman olduğunu ifade eden kişilerin davranışları ile benimsediklerini söyledikleri değerler arasındaki uyumsuzluklar, üzerinde düşünülmesi gereken önemli konulardır.</p><p>Eleştirinin amacı kişileri küçük düşürmek değil, <strong>yanlış davranışı görünür kılmak ve doğrusuna işaret etmektir.</strong> Bu nedenle değerlendirmelerimizde de adaletli olmayı, olayın farklı yönlerini gözetmeyi ve hüküm verirken ölçülü davranmayı esas alacağız.</p><h3>Mahremiyet ve İnsan Onuru</h3><p>Yaşanmış olayların aktarılması, kişilerin özel hayatlarının sınırsız biçimde açıklanabileceği anlamına gelmez. ANILTILAR'da <strong>mahremiyet en önemli hassasiyetimizdir.</strong></p><p>İsimler, soyadları, unvanlar ve olayın anlaşılması için gerekli ayrıntılar ele alınırken, kişilerin gereksiz yere teşhis edilmesine veya hedef hâline gelmesine yol açabilecek bilgiler konusunda son derece dikkatli davranılacaktır. Bir olayın ibretlik yönünü anlatmak için her ayrıntının açıklanması gerekmez.</p><p>Bununla birlikte, mahremiyetin sınırları, kamu yararı, kişisel sorumluluk ve yaşanmış bir olayın başkalarına ders olma değeri gibi meseleler ayrıca düşünülmesi gereken konulardır.</p><h3>ANILTILAR, BİZCE ve GÜNCEL Arasındaki Fark</h3><p>Bu üç bölüm, aynı temel değerlerden hareket etse de farklı amaçlara hizmet eder:</p><ul><li><strong>ANILTILAR:</strong> Bizzat yaşadığımız veya tecrübe aktarımı bakımından değer taşıyan olayları ele alır. Merkezinde yaşanmışlık, tecrübe ve çıkarılacak ders vardır.</li><li><strong>BİZCE:</strong> Genel konuları, düşünceleri, kavramları ve meseleleri farklı bir bakış açısıyla değerlendirir. Daha geniş, soyut ve kapsamlı tartışmalara alan açar.</li><li><strong>GÜNCEL:</strong> Yayımlandığı dönemin güncel olaylarını ve bu olayların görünen yüzünün arkasında bulunabilecek nedenleri, etkileri ve sonuçları inceler.</li></ul><p>Kısacası: <strong>ANILTILAR yaşanmışlığı anlatır. BİZCE düşünür ve yorumlar. GÜNCEL yaşananı sorgular.</strong></p><h3>Daha Yaşanabilir Bir Dünya İçin</h3><p>İnsanlık, geçmişte yaşananlardan ders çıkarabildiği ölçüde geleceğini değiştirebilir. Başkasının hatasından öğrenmek, aynı yanlışı kendimiz yapmadan doğruyu görebilmek demektir. Bir haksızlığı anlatmak, yalnızca geçmişi kayda geçirmek değil; benzer bir haksızlığın gelecekte yaşanmaması için sorumluluk üstlenmek anlamına da gelebilir.</p><p>ANILTILAR'da bazen gülecek, bazen üzülecek, bazen de kızacak ve en önemlisi hep düşüneceğiz. Fakat bütün bunların sonunda daha bilinçli, daha adaletli ve daha merhametli bir insan olabilmenin yollarını arayacağız.</p><p>İstediğimiz; insanların yaşananlardan ders aldığı, hatalarını düzelttiği, birbirinin hakkını gözettiği, vicdanını kaybetmediği ve daha temiz bir dünyanın inşasına katkıda bulunduğu bir hayattır. Umudumuz, geçmişin acılarının geleceğin tecrübelerine dönüşmesidir.</p><p>ANILTILAR, yaşanmışlıkların unutulup gitmemesi için değil, onlardan ders alınarak daha iyi bir gelecek kurulabilmesi için var.</p><blockquote class=\"manifesto-quote\"><p>“Kimi anılar tebessüm ettirir, kimileri içimizi inletir. Asıl mesele, her ikisinden de insanlığa fayda sağlayacak bir anlam çıkarabilmektir.”</p><cite>— ANILTILAR Manifestosu</cite></blockquote>"
    },
    "en": {
      "title": "What is ANILTILAR? — Lessons from Experiences, Wisdom from Memories",
      "summary": "Traces of the past, lessons for the future. ANILTILAR is where memories and groans meet — transforming experiences into wisdom.",
      "content": "<p class=\"lead\">Traces of the past, lessons for the future. Humans live, carry traces of their experiences, and over time memories resurface. Some memories bring a smile, some are recalled with laughter, while others leave an ache in the heart that fills the eyes with tears. <strong>ANILTILAR</strong> is where memories and groans meet — where lived experiences transform into wisdom, and wisdom into lessons.</p><p>Life is not composed solely of pleasant memories. Injustices, flawed decisions, neglected duties, broken hearts, and pain are equally part of life. While we prefer to share uplifting examples, our experiences teach us that mistakes, wrongdoings, and cautionary events must also be discussed. Some errors are understood only after being lived through, and certain truths go unnoticed until experienced firsthand.</p><p>ANILTILAR was not created merely to recount the past. Its core purpose is to extract righteous lessons from lived events, prevent similar mistakes, and contribute to building a more humane life.</p><h3>Why Does ANILTILAR Exist?</h3><p>Experiencing an event does not automatically guarantee learning from it. People often repeat mistakes, remain silent before injustice, or fail to glean personal wisdom from others' suffering. The true value of experience lies in its power to prompt reflection and refine behavior.</p><p>This is precisely where ANILTILAR intervenes. When sharing lived accounts, we ask not only <em>“What happened?”</em> but also <em>“Why did it happen, where was the error, how should one have acted, and what must be done next?”</em></p><p>Our goal is not to dwell on past grievances or blame individuals, but to seek paths toward righteous action and prevent recurring mistakes.</p><h3>Real Events, True Experiences</h3><p>The foundation of ANILTILAR rests primarily on firsthand experiences of our team members, alongside well-documented events of educational value. Every article concludes with explicit lessons, pitfalls to avoid, and guidance on the right path forward.</p><h3>Searching for Light in Darkness</h3><p>Highlighting dark experiences alone is insufficient. We strive to uncover the lessons within that darkness, pointing toward a constructive way forward.</p><h3>Islamic Perspective & Dignity</h3><p>Guided by Islamic principles of justice, truth, privacy, and human dignity, ANILTILAR evaluates actions constructively without shaming individuals or violating confidentiality.</p><h3>Three Pillars: ANILTILAR, BİZCE, GÜNCEL</h3><p><strong>ANILTILAR narrates lived experiences. BİZCE thinks and interprets. GÜNCEL questions current events.</strong></p><blockquote class=\"manifesto-quote\"><p>“Some memories bring smiles, others bring deep groans. The essential task is to extract meaning from both for the benefit of humanity.”</p><cite>— ANILTILAR Manifesto</cite></blockquote>"
    },
    "ar": {
      "title": "ما هو أَنِلْتِيلَار (ANILTILAR)؟ — عبرة من التجارب وعكمة من الذكريات",
      "summary": "آثار الماضي ودروس المستقبل. أَنِلْتِيلَار هي المساحة التي تلتقي فيها الذكريات والآهات لتحويل التجارب إلى حكم ودروس.",
      "content": "<p class=\"lead\">آثار الماضي ودروس المستقبل. يعيش الإنسان ويحمل أثر ما عاشه، ومع مرور الوقت تعود الذكريات. بعضها يرسم ابتسامة، وبعضها يترك غصة في القلب. <strong>أَنِلْتِيلَار (ANILTILAR)</strong> هي المساحة التي تلتقي فيها الذكريات والآهات لتحويل التجارب إلى حكم ودروس.</p><p>أنشئت أَنِلْتِيلَار ليس لمجرد سرد الماضي، بل لاستخلاص الدروس الصحيحة ومنع تكرار الأخطاء.</p><h3>لماذا أَنِلْتِيلَار؟</h3><p>وقوع الحدث لا يعني بالضرورة استخلاص الدرس منه. نهدف إلى البحث عن النهج السليم والتصرف العادل من واقع التجارب الحقيقية.</p><h3>البحث عن النور في قلب الظلام</h3><p>عرض الجانب المظلم لا يكفي بمفرده، بل يجب استخراج الدرس الذي يضيء طريق المستقبل.</p><h3>المعيار الإسلامي وحرمة الخصوصية</h3><p>تستند أَنِلْتِيلَار إلى المعايير الإسلامية مع مراعاة كاملة للخصوصية وكرامة الإنسان دون التشهير بأحد.</p><blockquote class=\"manifesto-quote\"><p>«بعض الذكريات تبتسم لها، وبعضها يعصر القلب. ولكن الأهم هو استخراج معنى ينفع الإنسانية من كلتيهما.»</p><cite>— بيان أَنِلْتِيلَار</cite></blockquote>"
    }
  },
  {
    "id": 3,
    "type": "guncel",
    "category": "Manifesto & İlk Makale",
    "category_en": "Manifesto & First Article",
    "category_ar": "البيان والمقال الأول",
    "date": "28 Eylül 2026",
    "readTime": "6 dk okuma",
    "icon": "📢",
    "tr": {
      "title": "GÜNCEL Nedir? — Görünenin Ötesine Bakmak",
      "summary": "GÜNCEL, MSK Labs'ın yaşanan güncel olaylara kendi bakış açısıyla yaklaşmak ve olayları yalnızca görünen yönleriyle değil, mümkün olduğunca arka planıyla birlikte değerlendirmek amacıyla oluşturduğu bir bölümdür.",
      "content": "<p>Gün içerisinde yüzlerce haberle, görüntüyle, yorumla ve bilgiyle karşılaşıyoruz. Dünyanın herhangi bir yerinde meydana gelen bir olay, birkaç saniye içerisinde telefonumuzun ekranına ulaşabiliyor.</p><p>Fakat bir haberin bize ulaşması, onu gerçekten anladığımız anlamına geliyor mu?</p><p>GÜNCEL, MSK Labs'ın yaşanan güncel olaylara kendi bakış açısıyla yaklaşmak ve olayları yalnızca görünen yönleriyle değil, mümkün olduğunca arka planıyla birlikte değerlendirmek amacıyla oluşturduğu bir bölümdür.</p><p>Burada amacımız yalnızca “Ne oldu?” sorusuna cevap vermek değildir.</p><p>Asıl sormaya çalıştığımız sorular şunlardır:</p><ul><li>Neden oldu?</li><li>Nasıl bu noktaya geldi?</li><li>Bize ne anlatıyor?</li><li>Bunun arkasında başka hangi gelişmeler bulunuyor?</li><li>Ve belki de en önemlisi: Görünenin arkasında ne var?</li></ul><h3>GÜNCEL'de neler olacak?</h3><p>GÜNCEL'in konusu yalnızca belirli bir alanla sınırlı değildir. Teknolojiden bilime, ekonomiden toplumsal olaylara, ülkelerin yaşadığı gelişmelerden dünyada meydana gelen önemli olaylara kadar güncel olan ve insanların hayatını ilgilendiren her konu GÜNCEL'in konusu olabilir.</p><p>Ancak burada bir haber ajansı veya günlük gazete mantığıyla hareket etmeyeceğiz. Bir olayın gerçekleştiğini tekrar etmek yerine, o olayın ne ifade ettiğini anlamaya çalışacağız. Çünkü bazen bir haberin kendisinden daha önemli olan şey, o haberin ortaya çıkmasına neden olan şartlardır.</p><p>Bazen de insanların önünde yalnızca olayın görünen kısmı vardır. Oysa olayın arka planında farklı gelişmeler, farklı hesaplar veya henüz fark edilmeyen sonuçlar bulunabilir. GÜNCEL, mümkün olduğunca bu noktaları sorgulamaya ve tespit edebildiklerini kullanıcı için vurgulamaya çalışacak.</p><h3>Biz olaylara nasıl bakıyoruz?</h3><p>MSK Labs ekibi Müslümandır. Dolayısıyla olaylara bakışımızın tamamen değerlerden bağımsız veya herhangi bir ölçütten yoksun olması beklenemez. Biz doğruluktan, adaletten, güvenilirlikten, selametten ve insanın iyiliğinden yana Müslümanca bir yaklaşımı esas alıyoruz.</p><p>Güncel bir olayı değerlendirirken de kendi anlayışımız doğrultusunda doğru olduğunu düşündüğümüz şeyi açıkça ifade etmeye çalışacağız. Elbette MSK Labs olarak yanılmaz olduğumuzu iddia etmiyoruz. Bir olayı yanlış değerlendirebilir, eksik bilgiye ulaşabilir veya bir konuda hata yapabiliriz. Fakat bildiğimizi doğru aktarmaya, ulaşabildiğimiz bilgileri değerlendirmeye ve kanaatimizi eğip bükmeden ortaya koymaya çalışacağız.</p><h3>Kaynaklar ve doğrulama</h3><p>Bugünün bilgi dünyasında bilgiye ulaşmak geçmişe göre çok daha kolay. Fakat doğru bilgiye ulaşmak aynı ölçüde kolay değil. Sosyal medya, internet siteleri ve farklı haber kaynakları aynı olay hakkında birbirinden tamamen farklı bilgiler sunabiliyor. Bilginin çok hızlı yayıldığı bir ortamda yanlış bilgi de aynı hızla yayılabileri.</p><p>Bu nedenle GÜNCEL yazılarında ulaşabildiğimiz kaynakları, verileri ve bilgileri mümkün olduğunca değerlendirmeye çalışacağız. Bunun yanında MSK Labs'ın sahip olduğu İslami düşünce ve kaynaklardan hareketle olayları değerlendireceğiz. Buradaki amacımız herhangi bir olayı yalnızca başkalarının nasıl yorumladığı üzerinden değerlendirmek değil; kendi ölçülerimiz içerisinde yeniden düşünmek ve sorgulamak.</p><h3>Tarafsız olmak mı, doğru olandan yana olmak mı?</h3><p>GÜNCEL'in önemli özelliklerinden biri de burada ortaya çıkıyor. Biz kendimizi hiçbir değerin olmadığı bir noktada duran ve her görüşe eşit mesafede yaklaşmak zorunda olan bir yapı olarak tanımlamıyoruz. Biz Müslümanız. Bu nedenle doğru olduğunu düşündüğümüz şeyden, adaletten ve HAKK’tan yana olmayı temel bir sorumluluk olarak görüyoruz.</p><p>Bu, her konuda doğru olduğumuzu ve doğru bilgiye ulaştığımızı iddia ettiğimiz anlamına gelmez. Tam tersine, yanılabileceğimizi bilerek doğruyu aramaya devam edeceğimiz anlamına gelir. Bir olay karşısında haksızlık görüyorsak bunu haksızlık olarak ifade etmekten, doğru olduğunu düşündüğümüz bir yaklaşımı savunmaktan veya yanlış gördüğümüz bir uygulamayı eleştirmekten kaçınmayacağız.</p><h3>Görünen ve görünmeyen</h3><p>GÜNCEL yazılarında özellikle üzerinde duracağımız noktalardan biri de olayların arka planıdır. Bir olay meydana gelir, haber yayınlanır, görüntüler paylaşılır, insanlar yorum yapar ve kısa süre sonra başka bir gündem gelir. Fakat bazen asıl önemli sorular cevaplanmadan konu kapanır:</p><ul><li>Bu olay neden şimdi gerçekleşti?</li><li>Kimleri etkiliyor?</li><li>Hangi sonuçları doğurabilir?</li><li>Daha önce yaşanan hangi gelişmelerle bağlantılı olabilir?</li><li>Bize neyi kabul ettirmeye veya neye yönlendirmeye çalışıyor olabilir?</li></ul><p>İşte GÜNCEL, bu soruları sormaya çalışacak. Burada önemli bir ayrım yapıyoruz: Bir olayın arka planını sorgulamak, elde olmayan bilgileri gerçekmiş gibi anlatmak anlamına gelmez. Bu nedenle değerlendirme ile kesin bilgi arasındaki ayrımı mümkün olduğunca korumaya çalışacağız.</p><h3>GÜNCEL'in amacı ne?</h3><p>GÜNCEL'in temel amacı okuyucunun yalnızca daha fazla haber okuması değildir. Tam tersine, daha fazla düşünmesini istiyoruz. Bir haberi gördüğünde hemen kabul etmek yerine sorgulamasını, bir olay hakkında ilk duyduğu bilgiyle yetinmemesini, görünen ile gerçek arasındaki farkı düşünmesini istiyoruz.</p><h3>BİZCE, ANILTILAR ve GÜNCEL</h3><p>MSK Labs içerisinde bu üç bölümün birbirinden farklı bir görevi bulunuyor:</p><p><strong>BİZCE</strong>, kavramlara, fikirlere, geçmişte yaşanmış olaylara ve insan hayatını ilgilendiren çeşitli meselelere MSK Labs'ın düşünce çizgisinden bakar.<br><strong>ANILTILAR</strong>, gerçek hayatta yaşanmış olayları ve bu olaylardan çıkarılabilecek tecrübeleri anlatır.<br><strong>GÜNCEL</strong> ise bugün yaşananlara bakar.</p><p>Böylece üç bölüm birbirini tamamlar:<br><strong>BİZCE düşünür. ANILTILAR yaşanmışlığı anlatır. GÜNCEL yaşananı sorgular.</strong></p><h3>Sonuç olarak</h3><p>GÜNCEL'i oluştururken kendimize basit bir görev koyuyoruz: Görünenle yetinmemek, daha fazla düşünmek ve düşündürmek, daha fazla sorgulamak ve sorgulatmak. GÜNCEL, o pencereyi biraz daha genişletmek için var.</p>"
    },
    "en": {
      "title": "What is GÜNCEL? — Looking Beyond the Surface",
      "summary": "GÜNCEL is the section created by MSK Labs to approach current events from its own perspective and evaluate them beyond surface details along with their background.",
      "content": "<p>Every day we encounter hundreds of news items, images, comments, and pieces of information. An event happening anywhere in the world reaches our phone screens within seconds.</p><p>But does receiving news mean we truly understand it?</p><p>GÜNCEL is created by MSK Labs to approach current events from its own perspective and to evaluate them beyond surface details, along with their underlying context whenever possible.</p><p>Our goal here is not merely to answer 'What happened?'</p><p>The core questions we seek to ask are:</p><ul><li>Why did it happen?</li><li>How did it reach this point?</li><li>What is it telling us?</li><li>What other developments lie behind it?</li><li>And perhaps most importantly: What lies behind the visible surface?</li></ul><h3>What will be in GÜNCEL?</h3><p>The scope of GÜNCEL is not restricted to a single domain. Anything current and relevant to human lives—from technology and science to economics, social affairs, and global developments—can be covered here.</p><p>However, we will not operate like a news agency or daily newspaper. Instead of repeating that an event occurred, we will strive to understand what it signifies. Because often, what is more important than the news item itself is the set of conditions that brought it about.</p><p>Sometimes, only the visible portion of an event is before the public, while background calculations or unnoticed consequences remain hidden. GÜNCEL will strive to question these points and highlight what it uncovers for the reader.</p><h3>How do we view events?</h3><p>The MSK Labs team is Muslim. Therefore, our perspective cannot be expected to be detached from values or lacking clear criteria. We embrace a principled approach grounded in truth, justice, trustworthiness, peace, and human well-being.</p><p>When evaluating a current event, we will openly state what we believe to be true according to our principles. Naturally, we do not claim infallibility. We might misjudge an event, obtain incomplete info, or make errors. But we commit to conveying what we know honestly and stating our convictions without bending them.</p><h3>Sources and Verification</h3><p>In today's information age, reaching info is far easier than before, but reaching accurate info is not equally simple. Social media and news outlets can present contradictory accounts of the same event, and false information spreads just as fast as the truth.</p><p>Hence, in GÜNCEL articles, we will carefully evaluate available sources, data, and evidence. Additionally, we will analyze events through Islamic thought and foundational references. Our goal is not to judge events solely by how others interpret them, but to re-examine and question them within our own principles.</p><h3>Being Neutral or Standing for Truth?</h3><p>This is where a key trait of GÜNCEL emerges. We do not define ourselves as an entity standing in a vacuum without values, obligated to maintain equal distance to all viewpoints. We are Muslims. Therefore, we regard standing for truth, justice, and HAKK (Truth/Righteousness) as a fundamental responsibility.</p><h3>Three Pillars: BİZCE, ANILTILAR, GÜNCEL</h3><p><strong>BİZCE thinks. ANILTILAR recounts lived experiences. GÜNCEL questions current events.</strong></p>"
    },
    "ar": {
      "title": "ما هو GÜNCEL؟ — النظر إلى ما وراء الظاهر",
      "summary": "قسم GÜNCEL هو المساحة التي يتناول فيها MSK Labs الأحداث الجارية من منظوره الخاص لتقييمها خلفياتها وسياقاتها.",
      "content": "<p>نتعرض يومياً لمئات الأخبار والصور والتعليقات والمعلومات. حدث يقع في أي مكان في العالم يصل إلى شاشات هواتفنا في غضون ثوانٍ.</p><p>ولكن هل وصول الخبر يعني فهمه حقاً؟</p><p>أنشئ قسم GÜNCEL ليتناول الأحداث الجارية من منظور MSK Labs الخاص وتقييمها ليس فقط بظواهرها بل بخلفياتها وسياقاتها بقدر الإمكان.</p><p>هدفنا هنا ليس مجرد الإجابة على سؤال 'ماذا حدث؟'</p><p>الأسئلة الأساسية التي نحاول طرحها هي:</p><ul><li>لماذا حدث ذلك؟</li><li>كيف وصل الأمر إلى هذه النقطة؟</li><li>ماذا يخبرنا هذا الحدث؟</li><li>ما هي التطورات الأخرى التي تقف وراءه؟</li><li>والأهم من ذلك: ماذا يوجد وراء الظاهر؟</li></ul><h3>ماذا سيكون في GÜNCEL؟</h3><p>مواضيع GÜNCEL ليست محصورة في مجال معين. من التكنولوجيا والعلوم إلى الاقتصاد والأحداث المجتمعية والتطورات العالمية، كل موضوع يهم حياة الناس يمكن أن يكون جزءاً من GÜNCEL.</p><p>لكننا لن نعمل بمنطق وكالة أنباء أو صحيفة يومية. بدلاً من تكرار أن حادثة قد وقعت، سنحاول فهم ما تعنيه. لأن الظروف التي أدت إلى ظهور الخبر غالباً ما تكون أهم من الخبر نفسه.</p><h3>كيف ننظر إلى الأحداث؟</h3><p>فريق MSK Labs مسلمون. لذلك لا يُتوقع أن تكون نظرتنا خالية من القيم أو المعايير. نحن نتبنى نهجاً إسلامياً قائماً على الصدق والعدل والأمانة والسلام وخير الإنسان.</p><p>عند تقييم أي حدث، سنعبر بوضوح عما نعتقد أنه الحق. وبالطبع لا ندعي العصمة من الخطأ، ولكننا نلتزم بنقل ما نعلمه بصدق دون تحريف.</p><h3>النزاهة والوقوف مع الحق</h3><p>نحن لا نعرّف أنفسنا ككيان يقف في منطقة محايدة بلا قيم. نحن مسلمون، ولذلك نرى أن الوقوف مع الحق والعدل مسؤولية أساسية.</p><h3>الأركان الثلاثة: BİZCE, ANILTILAR, GÜNCEL</h3><p><strong>BİZCE يفكر. ANILTILAR يروي التجارب. GÜNCEL يسائل الأحداث.</strong></p>"
    }
  },
  {
    "id": 4,
    "type": "bizce",
    "category": "Yazılım & Felsefe",
    "category_en": "Software & Philosophy",
    "category_ar": "البرمجيات والفلسفة",
    "date": "30 Eylül 2026",
    "readTime": "8 dk okuma",
    "icon": "💻",
    "tr": {
      "title": "Neden Ücretsiz? — Neden Kullanıcıyı Önceleyen Bir Yazılım Anlayışı?",
      "summary": "Her şey bir ihtiyaçla başladı. MSK Labs'ın yazılım geliştirme felsefesi, reklam ve kullanıcı verisi politikası, sürdürülebilirlik mimarisi ve gelecek hedefleri üzerine kapsamlı bir değerlendirme.",
      "content": "<p class=\"lead\">Her şey bir ihtiyaçla başladı. Bazen bir yazılıma ihtiyacınız olur. Araştırırsınız, özelliklerini incelersiniz, deneme sürümünü kullanırsınız ve tam işinizi göreceğine karar verdiğinizde karşınıza fiyatı çıkar. Belki 500, belki 700 dolar… Peki, sizin ihtiyacınız olan özellikler yazılımın sunduğu imkânların yalnızca yüzde 10'u veya yüzde 20'siyse? Hiç kullanmayacağınız özelliklerin de bedelini ödemek zorunda mısınız?</p><p>Bir başka ihtimal daha var. Uygulama uygun fiyatlıdır, ancak tanıtımında anlatılan özellikleri beklediğiniz kalitede sunamaz. Bu kez de ödediğiniz para karşılığında ihtiyacınızı giderememiş olursunuz. Her iki durumda da kullanıcı olarak kendimize şu soruyu sorduk: <em>İnsanların gerçekten ihtiyaç duyduğu yazılımları, onları gereksiz maliyetlere ve kısıtlamalara maruz bırakmadan geliştirmek mümkün değil mi?</em> MSK Labs'ın yazılım yaklaşımının temelinde bu soru var.</p><h3>Biz de Yapabildiğimizi Yapalım, İnsanlara Faydamız Dokunsun</h3><p>Ekonomik durumumuz ne her istediğimizi rahatça satın alabilecek kadar iyi ne de hiçbir imkâna sahip olmayacak kadar kötü. Biz de pek çok insan gibi ihtiyacımız olan ürünleri araştırıyor, fiyatlarını değerlendiriyor ve hangisine gerçekten ihtiyacımız olduğunu düşünüyorduk.</p><p>Uzun süre bu konuda nasıl bir yol izleyebileceğimizi düşündük. Sonunda kendi imkânlarımız ve teknik seviyemiz ölçüsünde yazılımlar geliştirmeye karar verdik. Böylece iki hedefi aynı anda gerçekleştirebilecektik: Bir yandan teknik bilgimizi, yazılım geliştirme tecrübemizi ve mühendislik yaklaşımımızı ilerletecek; diğer yandan insanların gerçek ihtiyaçlarına cevap verebilecek ürünleri ücretsiz olarak kullanıma sunabilecektik.</p><p>Bunu yaparken kullanıcıdan bir karşılık beklememeyi de benimsedik. Bir insan geliştirdiğimiz uygulamayı kullanır, işini görür ve hayatını kolaylaştırırsa bizim açımızdan bu zaten anlamlı bir sonuçtur. İmkânı olan ve çalışmalarımıza gönüllü olarak destek vermek isteyenler elbette bizimle iletişime geçebilir. İstemeyenlere de söyleyecek bir sözümüz yok. Canları sağ, kullanımları helal ve hoş olsun. Bizim için asıl mesele, bir insanın uygulamamızdan faydalanabilmesidir.</p><h3>Ücretsiz Demek, Özensiz Demek Değildir</h3><p>Bir yazılımın ücretsiz olması, onun gelişigüzel hazırlanabileceği anlamına gelmez. Bizim açımızdan ücretsiz sunulan bir ürünün de belirli bir kalite anlayışı, geliştirme disiplini ve sorumluluğu olmalıdır.</p><p>Bu nedenle uygulamalarımızı geliştirirken doğrudan kod yazmaya başlamıyoruz. Önce ekip olarak ihtiyaçları, özellikleri, yapılandırmaları ve kullanılacak teknikleri değerlendiriyoruz. Ardından yapay zekâ sistemlerinden de yararlanarak benzer uygulamaların dünya çapındaki gereksinimlerini, olası sorunlarını ve teknik çözüm yollarını araştırıyoruz. Toplanan bilgileri yeniden değerlendiriyor, kararlarımızı gözden geçiriyor ve uygulama sürecine bundan sonra geçiyoruz.</p><p>İlk sürümün hazırlanmasıyla işimiz bitmiyor. Uygulamanın niteliğine göre bir ila iki aydan sekiz ila on aya kadar uzayabilen deneme süreçlerinde, ürünü kullanacak kişilere demo sürümleri sunuyoruz. Onlardan gelen talepleri ve yaşadıkları sorunları değerlendirerek yeni sürümler hazırlıyor, denemeleri sürdürüyoruz. Örneğin, <strong>Haydi Namaza (Let's Pray)</strong> uygulamamızda yaklaşık sekiz aydır demo denemelerine devam ediyoruz. Amacımız, bir uygulamayı yalnızca ortaya çıkarmış olmak için yayımlamak değil, kullanılabilirliğini ve niteliğini mümkün olduğunca geliştirmektir.</p><p>Elbette bütün bu çalışmalar, hiçbir hata yaşanmayacağı anlamına gelmiyor. Yazılım geliştirme sürecinde hata giderme, iyileştirme ve yeni sürümler hazırlama ihtiyacı her zaman olabilir. Kullanıcılarımızın sorunlarını ve taleplerini bize iletebilecekleri bir destek ve talep yapısı da bu nedenle var ve aktif bir şekilde kullanıyoruz. Hazır olduğunu düşündüğümüz ürünü değil, yeterince olgunlaştırmaya çalıştığımız ürünü sunmayı önemsiyoruz.</p><h3>Reklam Olabilir, Ama Kullanıcının Huzuru Pahasına Değil</h3><p>Burada bir konuyu açıklığa kavuşturalım: MSK Labs olarak bütün reklamları tamamen reddettiğimizi söylemiyoruz. Uygulamalarımızda ve internet sitemizde reklam alanları bulunabilir. Ancak reklamın nerede ve nasıl gösterileceği bizim için önemlidir.</p><p>Bir uygulamayı açtığınız anda karşınıza çıkan, sizi on saniye boyunca izlemeye zorlayan bir reklam düşünün. Ya da tam bir işlem yaparken günlük kullanım kotanızın dolduğu söylenerek devam edebilmek için otuz saniyelik reklam izlemeye mecbur bırakıldığınızı… Biz kullanıcı deneyimini bu tür uygulamalar üzerine kurmak istemiyoruz. Kullanıcı bir PDF belgesini düzenliyorsa belgesini düzenleyebilmeli; bir hesaplama yapıyorsa işlemini tamamlayabilmeli; dikkatini dağıtan unsurlarla uğraşmak zorunda kalmamalıdır.</p><p>Bu nedenle reklam alanlarını, mümkün olduğu ölçüde, aktif çalışma ekranlarından uzakta; ayarlar, hakkımızda, güncelleme, biz kimiz ve benzeri bölümlerde konumlandırmayı düşünüyoruz. Bizim yaklaşımımızda reklam, uygulamanın önüne geçen bir unsur değil, kullanıcıyı rahatsız etmeden sürdürülebilirliğe katkı sağlayabilecek ikincil bir araç olmalıdır.</p><h3>İnsanları İhtiyaç Duymadıkları Şeyleri Satın Almaya Yönlendirmek İstemiyoruz</h3><p>MSK Labs'ın bu konudaki yaklaşımı yalnızca teknik bir tercih değildir. İnancımızla, insanlara bakışımızla ve çalışma prensiplerimizle de doğrudan ilişkilidir. Reklam, bir ürün hakkında insanları bilgilendirebilir; bunun kendiliğinden yanlış olduğunu düşünmıyoruz. Ancak insanın dikkatini sürekli çekmeye çalışan, ihtiyaç duymadığı ürünleri arzulamasını teşvik eden, satın alma dürtülerini besleyen ve gerçekçi olmayan vaatlerle kararlarını etkileyen reklam anlayışını helal ve doğru bulmuyor, mesafeli duruyoruz.</p><p>Bir ürünün çok iyi olduğunu söylemek kolaydır. Asıl mesele, ürünün gerçekten ne sunduğunu dürüstçe anlatabilmektir. Ürünün eksiklikleri varsa bunları gizlememek, yapamayacağı şeyleri yapabiliyormuş gibi göstermemek ve insanları yanlış beklentilere sürüklememek gerekir. Bize göre Müslüman bir üretici veya satıcı, yalnızca ürününü satmayı değil, karşısındaki insanın hakkını gözetmeyi de düşünmelidir. İnsanların huzurunu kaçıran, onları gereksiz harcamalara yönelten ve gerçeği olduğundan farklı gösteren bir ticari anlayışı doğru bulmuyoruz.</p><h3>Kullanıcı Verileri Satılık Değildir</h3><p>Ücretsiz yazılımlar söz konusu olduğunda önemli sorulardan biri de şudur: <em>Bir uygulama ücretsizse bunun karşılığında kullanıcıdan ne alınıyor?</em></p><p>Biz MSK Labs olarak insanların mahremiyetlerinin ticari kazanç uğruna araç hâline getirilmesini doğru bulmuyoruz. İnancımız ve insan haklarına bakışımız, kişisel bilgilerin korunmasını önemli bir sorumluluk olarak görmemizi gerektiriyor. Kullanıcının anlamını bilmediği, uzun ve karmaşık metinleri okumadan kabul etmek zorunda kalmasını da doğru bulmuyoruz. Uygulamalarımızı mümkün olduğunca kişisel verilere ihtiyaç duymayacak biçimde tasarlıyoruz. Mecburi kullanılan ve ihtiyaç duyulan verilerde ise neden ihtiyaç duyulduğu açıkça ifade edilerek gerekli onay ve izin alınacaktır.</p><h3>Peki, Para Kazanmayacaksanız Bu Çalışmalar Nasıl Devam Edecek?</h3><p>Bu sorunun son derece haklı bir tarafı var. Yazılım geliştirmek emek ister; sunucu, alan adı ve altyapı maliyetleri vardır. Biz bu konuyu çalışmalarımızın en dikkatli ele alınması gereken başlıklarından biri olarak görüyoruz.</p><p>Bu nedenle uygulamaları tasarlarken barındırma, sunucu kullanımı ve bakım maliyetlerini mümkün olduğunca azaltacak mimariler oluşturmaya çalışıyoruz. Hedefimiz, kullanıcı sayısı milyonları aşsa dahi sürdürülebilirliği mümkün olan, maliyetleri kontrol altında tutabilen sistemler geliştirmek. Tüm bu tedbirler uygulamalarımızın ücretsiz olma niteliğini değiştirmeyecektir.</p><p>Ödeme ve destek her zaman bizim için kullanıcının kendi rızası sonucu yapılacak, zorunluluk özelliği taşımayan bir konu olacaktır. Uygulamaların temel özelliklerinin herkes tarafından ücretsiz kullanılabilmesi bizim için vazgeçilmez bir ilkedir.</p><h3>MSK Labs: Bir Uygulama Ekibinden Daha Fazlası</h3><p>MSK Labs adındaki <strong>MSK</strong>; <em>Müslüman, Samimi ve Kararlı</em> anlayışımızı temsil ediyor. <strong>Labs</strong> ise <em>araştırma, geliştirme, deneme ve daha ileri teknik çalışmalar yapma</em> hedefimizi yansıtıyor.</p><p>Önümüzdeki <strong>4 yıllık dönemde</strong>, insanlara fayda sağlayan 20'den fazla uygulama geliştirmeyi; yüzlerce makale, anı ve değerlendirme yazısı yayımlamayı hedefliyoruz. <strong>8 yıllık hedefimiz</strong> ise çalışmalarımızı uluslararası ölçekte tanınabilecek bir seviyeye taşımak; yazılım geliştirme yaklaşımımızla ve mühendislik kalitemizle örnek gösterilen bir yapı oluşturabilmektir.</p><p>İş ortaklarımıza yalnızca müşteri gözüyle bakmıyoruz. Onların ihtiyaçlarını anlayan, birlikte düşünen ve ortaya çıkan üründen her iki tarafın da memnuniyet duyacağı bir çalışma ilişkisi kurmayı önemsiyoruz. Böylece insanlara ücretsiz sunduğumuz ürünlerle toplumsal fayda üretirken, özel yazılım çalışmalarımızla da teknik kapasitemizi geliştirebileceğimiz bir yapı oluşturmayı hedefliyoruz.</p><h3>Bizce Mesele Yalnızca Ücretsiz Yazılım Değil</h3><p>Dünyada her şeyin bir karşılığı olabilir; ticareti veya emeğin karşılığını yanlış bulmuyoruz. Ancak her faydanın mutlaka doğrudan bir ödeme karşılığında sunulması gerektiğini de düşünmüyoruz. Bazen bir insanın işini kolaylaştırmak, karşılayamadığı bir ihtiyacına çözüm üretmek başlı başına anlamlıdır.</p><p>Biz MSK Labs olarak yapmak istediğimiz, bütün dünyayı bir anda değiştirdiğimizi iddia etmek değil; yanlış bulduğumuz bazı alışkanlıklara karşı kendi çalışma biçimimizle farklı bir yolun mümkün olduğunu göstermektir. Bismillah diyerek başladığımız bu yolculukta niyetimiz, imkânlarımız ve gayretimiz ölçüsünde insanlara faydalı olabilmektir.</p><blockquote class=\"manifesto-quote\"><p>“Azim ve gayret bizden, tevfik Allah (c.c.)’tandır.”</p><cite>— MSK Labs Çalışma İlkesi</cite></blockquote>"
    },
    "en": {
      "title": "Why Free? — A User-First Approach to Software",
      "summary": "It all started with a need. A comprehensive reflection on MSK Labs' software philosophy, ad & user data policies, sustainable architecture, and long-term goals.",
      "content": "<p class=\"lead\">It all started with a need. Sometimes you need a software application. You research it, review its features, try out the demo, and just when you decide it fits your workflow, you face the price tag: $500, maybe $700… But what if you only need 10% or 20% of its feature set? Why should you pay for functionality you will never use?</p><p>As users, we asked ourselves: <em>Is it not possible to build software that answers real human needs without subjecting users to unnecessary costs and artificial restrictions?</em> This core question forms the bedrock of MSK Labs' engineering philosophy.</p><h3>Doing What We Can to Benefit Humanity</h3><p>We decided to develop software within our technical capacity and resources. This allows us to fulfill two goals simultaneously: advancing our engineering experience while delivering useful, high-quality software to people completely free of charge.</p><p>We expect nothing in return. If someone uses an app we built and it makes their life easier, that is already a meaningful outcome for us. Those who wish to support us voluntarily are welcome to reach out; for those who choose not to, we wish them well — our software is halal and freely theirs to use.</p><h3>Free Does Not Mean Careless</h3><p>Being free does not mean a software product can be cobbled together carelessly. Free products must carry an uncompromising standard of quality and discipline.</p><p>We don't jump straight into coding. We first evaluate requirements, research global standards and AI-assisted technical solutions, and conduct rigorous testing. For example, our <strong>Let's Pray (Haydi Namaza)</strong> application has been in active demo testing for nearly 8 months. Our priority is not rushing products out, but nurturing them until they are thoroughly mature.</p><h3>Ads May Exist, But Never at the Expense of User Peace</h3><p>We do not reject all advertising outright, but we care deeply about where and how ads are displayed. We refuse to force users to watch 10-second opening ads or interrupt their workflow with 30-second locks. If an ad area exists, it will strictly remain outside active workspaces — confined to settings or about pages as a secondary sustainability tool.</p><h3>User Data Is Not for Sale</h3><p>If an app is free, what is being taken from the user? At MSK Labs, we believe privacy is a sacred responsibility. We refuse to commodify personal data or harvest user telemetry for commercial profit. Our apps are engineered to require minimal to zero personal data.</p><h3>MSK Labs: More Than an App Team</h3><p>The <strong>MSK</strong> in MSK Labs stands for <em>Muslim, Sincere, and Determined (Müslüman, Samimi ve Kararlı)</em>, while <strong>Labs</strong> reflects our commitment to research, development, and engineering excellence.</p><p>Our <strong>4-year goal</strong> is to launch over 20 useful applications alongside hundreds of insightful articles. Our <strong>8-year vision</strong> is to establish MSK Labs as an internationally recognized model of ethical software engineering.</p><blockquote class=\"manifesto-quote\"><p>“Determination and effort belong to us; success and guidance come from Allah (c.c.).”</p><cite>— MSK Labs Core Principle</cite></blockquote>"
    },
    "ar": {
      "title": "لماذا مجاناً؟ — نهج برمجي يضع المستخدم في المقام الأول",
      "summary": "بدأ كل شيء بحاجة. تقييم شامل لفلسفة MSK Labs في تطوير البرمجيات، سياسة الإعلانات والبيانات، والأهداف المستقبلية.",
      "content": "<p class=\"lead\">بدأ كل شيء بحاجة. في كثير من الأحيان تحتاج إلى برنامج معين، فتجد أن سعره باهظ جداً رغم أنك لا تحتاج إلا لـ 10% من مميزاته. من هنا سألنا أنفسنا: <em>ألا يمكن تطوير برامج تلبي احتياجات الناس الحقيقية دون إرهاقهم بتكاليف وقيود لا داعي لها؟</em> هذا السؤال هو جوهر فلسفة MSK Labs.</p><h3>تقديم الفائدة دون مقابل</h3><p>قررنا تطوير برامج وفق إمكانياتنا الفنية لتلبية احتياجات الناس مجاناً. بالنسبة لنا، إذا استغل شخص برمجياتنا وسهلت حياته، فهذه النتيجة كافية تماماً وتعد مكسباً حقيقياً.</p><h3>مجاني لا يعني خالي من الجودة</h3><p>المنتج المجاني يجب أن يحمل نفس الانضباط والجودة العالية. فنحن لا نبدأ بالتكويد مباشرة، بل نتبع منهجية بحث واختبار مكثفة تجعل المنتج ناضجاً وموثوقاً.</p><h3>بيانات المستخدم ليست للبيع</h3><p>نحن نرى حماية خصوصية المستخدمين مسؤولية أخلاقية وإسلامية، ونرفض تماماً تحويل بيانات الناس الشخصية إلى سلعة تجارية أو وسيلة للربح.</p><h3>MSK Labs: أكثر من مجرد فريق برمجيات</h3><p>ترمز حروف <strong>MSK</strong> إلى: <em>مسلم، صادق، ومصمم (Müslüman, Samimi, Kararlı)</em>، وتعبير <strong>Labs</strong> يعكس شغفنا بالبحث والتطوير والتميز الهندسي.</p><blockquote class=\"manifesto-quote\"><p>«العزم والجهد منا، والتوفيق من الله عز وجل.»</p><cite>— مبدأ العمل في MSK Labs</cite></blockquote>"
    }
  }
];

function updateHeaderAndTabs() {
  var mainTitle = document.getElementById('headerMainTitle');
  var btnBizce = document.getElementById('tabBizce');
  var btnAnilts = document.getElementById('tabAnilts');
  var btnGuncel = document.getElementById('tabGuncel');

  if (btnBizce) btnBizce.className = 'section-tab-btn';
  if (btnAnilts) btnAnilts.className = 'section-tab-btn';
  if (btnGuncel) btnGuncel.className = 'section-tab-btn';

  if (currentSection === 'anilts') {
    if (btnAnilts) btnAnilts.className = 'section-tab-btn active-anilts';
    if (mainTitle) {
      if (currentLang === 'ar') mainTitle.innerText = '📖 أنيلتيلار';
      else if (currentLang === 'en') mainTitle.innerText = '📖 ANILTILAR';
      else mainTitle.innerText = '📖 ANILTILAR';
    }
  } else if (currentSection === 'guncel') {
    if (btnGuncel) btnGuncel.className = 'section-tab-btn active-guncel';
    if (mainTitle) {
      if (currentLang === 'ar') mainTitle.innerText = '📰 الأخبار';
      else if (currentLang === 'en') mainTitle.innerText = '📰 NEWS';
      else mainTitle.innerText = '📰 GÜNCEL';
    }
  } else {
    if (btnBizce) btnBizce.className = 'section-tab-btn active-bizce';
    if (mainTitle) {
      if (currentLang === 'ar') mainTitle.innerText = '✍️ بيزجه';
      else if (currentLang === 'en') mainTitle.innerText = '✍️ BİZCE';
      else mainTitle.innerText = '✍️ BİZCE';
    }
  }

  if (btnBizce) {
    if (currentLang === 'ar') btnBizce.innerText = '✍️ بيزجه';
    else if (currentLang === 'en') btnBizce.innerText = '✍️ BİZCE';
    else btnBizce.innerText = '✍️ BİZCE';
  }
  if (btnAnilts) {
    if (currentLang === 'ar') btnAnilts.innerText = '📖 أنيلتيلار';
    else if (currentLang === 'en') btnAnilts.innerText = '📖 ANILTILAR';
    else btnAnilts.innerText = '📖 ANILTILAR';
  }
  if (btnGuncel) {
    if (currentLang === 'ar') btnGuncel.innerText = '📰 الأخبار';
    else if (currentLang === 'en') btnGuncel.innerText = '📰 NEWS';
    else btnGuncel.innerText = '📰 GÜNCEL';
  }
}

function switchSection(sec) {
  stopTTS();
  currentSection = sec;
  currentSubFilter = 'all';
  currentPost = null;

  // Sync browser address bar URL parameters smoothly
  try {
    var langParam = currentLang && currentLang !== 'tr' ? '&lang=' + currentLang : '';
    var newUrl = 'blog.html?type=' + sec + langParam;
    if (window.location.search.indexOf('type=' + sec) === -1) {
      window.history.pushState({ section: sec }, '', newUrl);
    }
  } catch(e) {}

  var listView = document.getElementById('listView');
  var readerView = document.getElementById('readerView');
  if (readerView) readerView.style.display = 'none';
  if (listView) listView.style.display = 'block';

  updateHeaderAndTabs();
  renderSubCategories();
  renderPosts();
  if (typeof window.highlightActiveTopNav === 'function') window.highlightActiveTopNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSubCategories() {
  var pillsContainer = document.getElementById('subCategoryPills');
  if (!pillsContainer) return;

  if (currentSection === 'anilts') {
    var tAll = (currentLang === 'ar' ? '🌟 جميع الذكريات' : (currentLang === 'en' ? '🌟 All Memoirs' : '🌟 Tüm Anıltılar'));
    var tLife = (currentLang === 'ar' ? '🌿 دروس الحياة' : (currentLang === 'en' ? '🌿 Life Lessons' : '🌿 Hayat Dersleri'));
    var tWork = (currentLang === 'ar' ? '🤝 حياة العمل' : (currentLang === 'en' ? '🤝 Work Life' : '🤝 Çalışma Hayatı'));

    pillsContainer.innerHTML = 
      '<button class="cat-pill ' + (currentSubFilter === 'all' ? 'active' : '') + '" onclick="setSubFilter(\'all\')">' + tAll + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'life' ? 'active' : '') + '" onclick="setSubFilter(\'life\')">' + tLife + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'work' ? 'active' : '') + '" onclick="setSubFilter(\'work\')">' + tWork + '</button>';
  } else if (currentSection === 'guncel') {
    var tAllGuncel = (currentLang === 'ar' ? '🌟 جميع الأخبار' : (currentLang === 'en' ? '🌟 All News' : '🌟 Tüm Güncel Yazılar'));
    var tAnnounce = (currentLang === 'ar' ? '📢 الإعلانات' : (currentLang === 'en' ? '📢 Announcements' : '📢 Duyurular & Yenilikler'));
    var tReleases = (currentLang === 'ar' ? '🚀 التحديثات' : (currentLang === 'en' ? '🚀 Release Notes' : '🚀 Sürüm Notları'));

    pillsContainer.innerHTML = 
      '<button class="cat-pill ' + (currentSubFilter === 'all' ? 'active' : '') + '" onclick="setSubFilter(\'all\')">' + tAllGuncel + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'announce' ? 'active' : '') + '" onclick="setSubFilter(\'announce\')">' + tAnnounce + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'release' ? 'active' : '') + '" onclick="setSubFilter(\'release\')">' + tReleases + '</button>';
  } else {
    var tAllBizce = (currentLang === 'ar' ? '🌟 جميع مقالات بيزجه' : (currentLang === 'en' ? '🌟 All Bizce Articles' : '🌟 Tüm Bizce Yazıları'));
    var tTech = (currentLang === 'ar' ? '💻 التكنولوجيا' : (currentLang === 'en' ? '💻 Technology' : '💻 Teknoloji'));
    var tThought = (currentLang === 'ar' ? '🧠 الفكر والأفكار' : (currentLang === 'en' ? '🧠 Thought & Ideas' : '🧠 Düşünce & Fikir'));

    pillsContainer.innerHTML = 
      '<button class="cat-pill ' + (currentSubFilter === 'all' ? 'active' : '') + '" onclick="setSubFilter(\'all\')">' + tAllBizce + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'tech' ? 'active' : '') + '" onclick="setSubFilter(\'tech\')">' + tTech + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'thought' ? 'active' : '') + '" onclick="setSubFilter(\'thought\')">' + tThought + '</button>';
  }
}

function setSubFilter(sub) {
  currentSubFilter = sub;
  renderSubCategories();
  renderPosts();
}

function formatTitleHTML(rawTitle) {
  if (!rawTitle) return '';
  var parts = rawTitle.split(' — ');
  if (parts.length > 1) {
    return '<span class="title-main">' + parts[0] + '</span><span class="title-subtitle">' + parts.slice(1).join(' — ') + '</span>';
  }
  return rawTitle;
}

function getDynamicReadTime(htmlContent, lang) {
  if (!htmlContent) return lang === 'ar' ? 'قراءة 5 دقائق' : (lang === 'en' ? '5 min read' : '5 dk okuma');
  var temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  var text = temp.textContent || temp.innerText || '';
  var words = text.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length;
  var mins = Math.max(1, Math.ceil(words / 180)); // 180 words/min average reading speed
  if (lang === 'ar') {
    return 'قراءة ' + mins + ' دقائق';
  } else if (lang === 'en') {
    return mins + ' min read';
  } else {
    return mins + ' dk okuma';
  }
}

function toggleTTSAccordion(forceOpen) {
  var wrapper = document.getElementById('ttsControlsWrapper');
  var chevron = document.getElementById('ttsChevron');
  var bar = document.getElementById('ttsPlayerBar');
  if (!wrapper) return;

  var isExpanded = bar && bar.classList.contains('expanded');
  if (forceOpen === true || (forceOpen !== false && !isExpanded)) {
    if (bar) bar.classList.add('expanded');
    wrapper.style.maxHeight = '500px';
    wrapper.style.opacity = '1';
    wrapper.style.marginTop = '0.85rem';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    if (bar) bar.classList.remove('expanded');
    wrapper.style.maxHeight = '0';
    wrapper.style.opacity = '0';
    wrapper.style.marginTop = '0';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}

function updateReaderViewLanguage() {
  if (!currentPost) return;

  var langData = currentPost[currentLang] || currentPost['tr'];
  var category = currentPost['category_' + currentLang] || currentPost.category;

  var elCategory = document.getElementById('readCategory');
  var elTitle = document.getElementById('readTitle');
  var elDate = document.getElementById('readDate');
  var elTime = document.getElementById('readTime');
  var elContent = document.getElementById('readContent');
  var lblBack = document.getElementById('lblBack');

  if (elCategory) elCategory.innerText = category;
  if (elTitle) elTitle.innerHTML = formatTitleHTML(langData.title);
  if (elDate) elDate.innerText = currentPost.date;

  if (elContent) {
    elContent.innerHTML = langData.content;
    applyFontSize();
  }

  var readTimeStr = getDynamicReadTime(langData.content, currentLang);
  if (elTime) elTime.innerText = '⏱️ ' + readTimeStr;

  // TTS Title ("Sesli Oku")
  var lblTtsTitle = document.getElementById('lblTtsTitle');
  if (lblTtsTitle) {
    if (currentLang === 'ar') lblTtsTitle.innerText = '🔊 القراءة الصوتية';
    else if (currentLang === 'en') lblTtsTitle.innerText = '🔊 Read Aloud';
    else lblTtsTitle.innerText = '🔊 Sesli Oku';
  }

  var btnPlay = document.getElementById('btnPlay');
  var btnPause = document.getElementById('btnPause');
  var btnStop = document.getElementById('btnStop');

  if (btnPlay) btnPlay.innerText = (currentLang === 'ar' ? '▶️ استماع' : (currentLang === 'en' ? '▶️ Listen' : '▶️ Dinle'));
  if (btnPause) btnPause.innerText = (currentLang === 'ar' ? '⏸️ إيقاف مؤقت' : (currentLang === 'en' ? '⏸️ Pause' : '⏸️ Duraklat'));
  if (btnStop) btnStop.innerText = (currentLang === 'ar' ? '⏹️ إيقاف' : (currentLang === 'en' ? '⏹️ Stop' : '⏹️ Durdur'));

  var voiceLabels = document.querySelectorAll('.tts-selects label');
  if (voiceLabels && voiceLabels.length >= 2) {
    voiceLabels[0].innerText = (currentLang === 'ar' ? 'الصوت:' : (currentLang === 'en' ? 'Voice:' : 'Ses:'));
    voiceLabels[1].innerText = (currentLang === 'ar' ? 'السرعة:' : (currentLang === 'en' ? 'Speed:' : 'Hız:'));
  }

  var genderSel = document.getElementById('voiceGender');
  if (genderSel && genderSel.options.length >= 2) {
    genderSel.options[0].text = (currentLang === 'ar' ? '👨 رجل' : (currentLang === 'en' ? '👨 Male' : '👨 Erkek'));
    genderSel.options[1].text = (currentLang === 'ar' ? '👩 امرأة' : (currentLang === 'en' ? '👩 Female' : '👩 Kadın'));
  }
  checkAndDetectDeviceVoices();

  var speedSel = document.getElementById('voiceSpeed');
  if (speedSel && speedSel.options.length >= 3) {
    speedSel.options[0].text = '1.0x';
    speedSel.options[1].text = '1.25x';
    speedSel.options[2].text = '1.5x';
  }

  var lblFontSizer = document.getElementById('lblFontSizer');
  var btnFontMinus = document.getElementById('btnFontMinus');
  var btnFontPlus = document.getElementById('btnFontPlus');
  var btnFontReset = document.getElementById('btnFontReset');
  if (lblFontSizer) {
    lblFontSizer.innerText = (currentLang === 'ar' ? 'حجم الخط:' : (currentLang === 'en' ? 'Text Size:' : 'Yazı Boyutu:'));
  }
  if (btnFontMinus) {
    btnFontMinus.title = (currentLang === 'ar' ? 'تصغير الخط (-2pt)' : (currentLang === 'en' ? 'Shrink Font (-2pt)' : 'Yazıyı Küçült (-2pt)'));
  }
  if (btnFontPlus) {
    btnFontPlus.title = (currentLang === 'ar' ? 'تكبير الخط (+2pt)' : (currentLang === 'en' ? 'Enlarge Font (+2pt)' : 'Yazıyı Büyüt (+2pt)'));
  }
  if (btnFontReset) {
    btnFontReset.innerText = (currentLang === 'ar' ? 'إعادة ضبط' : (currentLang === 'en' ? 'Reset' : 'Sıfırla'));
    btnFontReset.title = (currentLang === 'ar' ? 'إعادة ضبط إلى الافتراضي' : (currentLang === 'en' ? 'Reset to Default' : 'Varsayılana Sıfırla'));
  }
}

function setLang(lang) {
  currentLang = lang || 'tr';
  try {
    localStorage.setItem('user_lang', currentLang);
  } catch(e) {}

  document.body.className = 'lang-' + currentLang;
  if (currentLang === 'ar') {
    document.body.setAttribute('dir', 'rtl');
  } else {
    document.body.removeAttribute('dir');
  }

  var btns = document.querySelectorAll('.lang-switcher button');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('data-lang') === currentLang) {
      btns[i].classList.add('active');
    } else {
      btns[i].classList.remove('active');
    }
  }

  updateHeaderAndTabs();

  var readerView = document.getElementById('readerView');
  var isReading = (currentPost !== null && readerView && readerView.style.display !== 'none');

  if (isReading) {
    updateReaderViewLanguage();
    if (synth && synth.speaking) {
      playTTS();
    }
  } else {
    renderSubCategories();
    renderPosts();
  }
}

function renderPosts() {
  var grid = document.getElementById('postsGrid');
  var listSection = document.getElementById('postsListSection');
  var listContainer = document.getElementById('postsListContainer');
  var listTitle = document.getElementById('listSectionTitle');

  if (!grid) return;
  grid.innerHTML = '';
  if (listContainer) listContainer.innerHTML = '';

  var pageInd = document.getElementById('pageIndicator');
  if (pageInd) {
    if (currentLang === 'ar') pageInd.innerText = 'صفحة 1 / 1';
    else if (currentLang === 'en') pageInd.innerText = 'Page 1 / 1';
    else pageInd.innerText = 'Sayfa 1 / 1';
  }

  var pagButtons = document.querySelectorAll('.pagination-bar button');
  if (pagButtons && pagButtons.length >= 3) {
    pagButtons[0].innerText = (currentLang === 'ar' ? '« السابق' : (currentLang === 'en' ? '« Previous' : '« Önceki'));
    pagButtons[2].innerText = (currentLang === 'ar' ? 'التالي »' : (currentLang === 'en' ? 'Next »' : 'Sonraki »'));
  }

  // KESİN AYRIŞTIRMA: Sadece geçerli section ('bizce' veya 'anilts') filtrelenir!
  var filtered = blogPostsData.filter(function(p) {
    return p.type === currentSection;
  });

  var featuredPosts = filtered.slice(0, 3);
  var remainingPosts = filtered.slice(3);

  // 1. İLK 3 ÖNE ÇIKAN KART
  for (var i = 0; i < featuredPosts.length; i++) {
    var post = featuredPosts[i];
    var langData = post[currentLang] || post['tr'];
    var category = post['category_' + currentLang] || post.category;
    var isAnilts = (post.type === 'anilts');

    var card = document.createElement('div');
    card.className = 'post-card';
    card.setAttribute('data-id', post.id);
    card.onclick = (function(pId) {
      return function() { openPost(pId); };
    })(post.id);

    var btnText = (currentLang === 'ar' ? 'اقرأ المزيد ←' : (currentLang === 'en' ? 'Read Story →' : 'Devamını Oku →'));
    var ttsText = (currentLang === 'ar' ? 'استماع' : (currentLang === 'en' ? 'Listen' : 'Sesli Dinle'));

    var imgClass = 'card-img-placeholder' + (isAnilts ? ' card-img-anilts' : '');
    var tagClass = 'post-tag' + (isAnilts ? ' post-tag-anilts' : '');
    var readMoreClass = 'read-more-btn' + (isAnilts ? ' read-more-anilts' : '');

    var readTimeStr = getDynamicReadTime(langData.content, currentLang);

    card.innerHTML = '<div class="' + imgClass + '">' + (post.icon || '📝') + '</div>' +
      '<div class="card-body">' +
        '<div>' +
          '<div class="post-meta">' +
            '<span class="' + tagClass + '">' + category + '</span>' +
            '<span>⏱️ ' + readTimeStr + '</span>' +
          '</div>' +
          '<h2 class="post-title">' + formatTitleHTML(langData.title) + '</h2>' +
          '<p class="post-excerpt">' + langData.summary + '</p>' +
        '</div>' +
        '<div class="card-actions">' +
          '<span class="' + readMoreClass + '">' + btnText + '</span>' +
          '<span class="card-tts-badge">🔊 ' + ttsText + '</span>' +
        '</div>' +
      '</div>';
    grid.appendChild(card);
  }

  // 2. 3'TEN SONRAKİ YAZILAR İÇİN KOMPAKT LİSTE
  if (remainingPosts.length > 0 && listSection && listContainer) {
    listSection.style.display = 'block';
    if (listTitle) {
      listTitle.innerText = (currentLang === 'ar' ? '📋 مقالات أخرى' : (currentLang === 'en' ? '📋 Other Articles' : '📋 Diğer Tüm Yazılar'));
    }

    for (var j = 0; j < remainingPosts.length; j++) {
      var rPost = remainingPosts[j];
      var rLangData = rPost[currentLang] || rPost['tr'];
      var rCategory = rPost['category_' + currentLang] || rPost.category;
      var rIsAnilts = (rPost.type === 'anilts');

      var listItem = document.createElement('div');
      listItem.className = 'post-list-item';
      listItem.setAttribute('data-id', rPost.id);
      listItem.onclick = (function(pId) {
        return function() { openPost(pId); };
      })(rPost.id);

      var iconClass = 'list-item-icon' + (rIsAnilts ? ' anilts-icon' : '');
      var rTagClass = 'post-tag' + (rIsAnilts ? ' post-tag-anilts' : '');

      var rReadTimeStr = getDynamicReadTime(rLangData.content, currentLang);

      listItem.innerHTML = '<div class="' + iconClass + '">' + (rPost.icon || '📝') + '</div>' +
        '<div class="list-item-content">' +
          '<h4 class="list-item-title">' + formatTitleHTML(rLangData.title) + '</h4>' +
          '<div class="list-item-meta">' +
            '<span class="' + rTagClass + '">' + rCategory + '</span>' +
            '<span>📅 ' + rPost.date + '</span>' +
            '<span>⏱️ ' + rReadTimeStr + '</span>' +
          '</div>' +
        '</div>';

      listContainer.appendChild(listItem);
    }
  } else if (listSection) {
    listSection.style.display = 'none';
  }
}

function openPost(id) {
  stopTTS();
  currentPost = blogPostsData.find(function(p) { return p.id === id; });
  if (!currentPost) return;

  currentSection = currentPost.type;
  updateHeaderAndTabs();
  updateReaderViewLanguage();
  toggleTTSAccordion(false);

  var listView = document.getElementById('listView');
  var readerView = document.getElementById('readerView');
  if (listView) listView.style.display = 'none';
  if (readerView) readerView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showList() {
  stopTTS();
  currentPost = null;
  var readerView = document.getElementById('readerView');
  var listView = document.getElementById('listView');
  if (readerView) readerView.style.display = 'none';
  if (listView) listView.style.display = 'block';
  updateHeaderAndTabs();
  renderSubCategories();
  renderPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function playTTS() {
  if (!synth) return alert("Tarayıcınız sesli okuma özelliğini desteklemiyor.");
  toggleTTSAccordion(true);
  if (synth.speaking && synth.paused) {
    synth.resume();
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'inline-flex';
    return;
  }

  synth.cancel();

  var readContent = document.getElementById('readContent');
  var articleText = readContent ? readContent.innerText : '';
  currentUtterance = new SpeechSynthesisUtterance(articleText);

  if (currentLang === 'tr') currentUtterance.lang = 'tr-TR';
  else if (currentLang === 'en') currentUtterance.lang = 'en-US';
  else if (currentLang === 'ar') currentUtterance.lang = 'ar-SA';

  var speedEl = document.getElementById('voiceSpeed');
  var speed = parseFloat(speedEl ? speedEl.value : '1.0');
  currentUtterance.rate = speed;

  var voices = synth.getVoices();
  var genderEl = document.getElementById('voiceGender');
  var genderPref = genderEl ? genderEl.value : 'male';
  
  var langPrefix = currentUtterance.lang.slice(0, 2).toLowerCase();
  var langVoices = voices.filter(function(v) {
    return v.lang.toLowerCase().startsWith(langPrefix);
  });

  var femaleKeywords = ['female', 'zira', 'yelda', 'seda', 'emel', 'filiz', 'dilara', 'ayşegül', 'gül', 'woman', 'lady'];
  var maleKeywords = ['male', 'david', 'tolga', 'cem', 'ahmet', 'man', 'guy'];

  var matchedVoice = null;
  var isExactGenderMatch = false;

  if (langVoices.length > 0) {
    if (genderPref === 'female') {
      matchedVoice = langVoices.find(function(v) {
        var lowerName = v.name.toLowerCase();
        return femaleKeywords.some(function(kw) { return lowerName.includes(kw); });
      });
    } else {
      matchedVoice = langVoices.find(function(v) {
        var lowerName = v.name.toLowerCase();
        return maleKeywords.some(function(kw) { return lowerName.includes(kw); });
      });
    }

    if (matchedVoice) {
      isExactGenderMatch = true;
    } else {
      matchedVoice = langVoices[0]; // Fallback to available voice
    }
  }

  if (matchedVoice) {
    currentUtterance.voice = matchedVoice;
  }

  var noticeEl = document.getElementById('ttsNotice');
  var noticeTextEl = document.getElementById('ttsNoticeText');

  // Keep pitch at natural 1.0 tone under all circumstances
  currentUtterance.pitch = 1.0;

  if (genderPref === 'female') {
    if (isExactGenderMatch) {
      if (noticeEl) noticeEl.style.display = 'none';
    } else {
      if (noticeEl) {
        noticeEl.style.display = 'block';
        var noticeMsg = (currentLang === 'ar' 
          ? 'ℹ️ لم يتم العثور على محرك صوت نسائي في جهازك؛ يتم القراءة بالمحرك الصوتي المتاح. (عند إضافة حزمة صوت نسائي في إعدادات جهازك سيعمل تلقائياً.)'
          : (currentLang === 'en'
              ? 'ℹ️ Dedicated female voice engine is not installed on your device; reading with default male voice. (Adding a female voice package in your OS settings will activate this feature.)'
              : 'ℹ️ Cihazınızda tanımlı Kadın ses paketi bulunmadığı için okuma mevcut Erkek ses motoru ile yapılmaktadır. (İşletim sistemi ayarlarınızdan Türkçe Kadın ses paketi eklediğinizde otomatik aktifleşecektir.)'));
        if (noticeTextEl) noticeTextEl.innerText = noticeMsg;
        else noticeEl.innerText = noticeMsg;
      }
    }
  } else {
    if (noticeEl) noticeEl.style.display = 'none';
  }

  currentUtterance.onstart = function() {
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'inline-flex';
  };
  currentUtterance.onend = function() {
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'none';
  };

  synth.speak(currentUtterance);
}

function hideTTSNotice() {
  var noticeEl = document.getElementById('ttsNotice');
  if (noticeEl) noticeEl.style.display = 'none';
}

function pauseTTS() {
  if (synth && synth.speaking) {
    synth.pause();
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'none';
  }
}

function stopTTS() {
  if (synth) {
    synth.cancel();
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'none';
  }
}

function restartTTSIfPlaying() {
  if (synth && synth.speaking) {
    playTTS();
  }
}

function handleUrlParams() {
  var params = new URLSearchParams(window.location.search);
  var typeParam = (params.get('type') || params.get('cat') || '').toLowerCase();
  var postIdParam = parseInt(params.get('id') || params.get('post') || '0', 10);
  var sec = 'bizce';
  if (typeParam === 'anilts' || typeParam === 'aniltilar' || typeParam === 'anilti') {
    sec = 'anilts';
  } else if (typeParam === 'guncel' || typeParam === 'news') {
    sec = 'guncel';
  }
  switchSection(sec);
  if (postIdParam > 0) {
    openPost(postIdParam);
  }
}

window.addEventListener('languageChanged', function(e) {
  var lang = (e && e.detail && e.detail.lang) ? e.detail.lang : (localStorage.getItem('user_lang') || 'tr');
  currentLang = lang;
  updateHeaderAndTabs();
  var readerView = document.getElementById('readerView');
  var isReading = (currentPost !== null && readerView && readerView.style.display !== 'none');

  if (isReading) {
    updateReaderViewLanguage();
    if (synth && synth.speaking) {
      playTTS();
    }
  } else {
    renderSubCategories();
    renderPosts();
  }
});

document.addEventListener("DOMContentLoaded", function() {
  var storedLang = localStorage.getItem('user_lang') || 'tr';
  currentLang = storedLang;

  handleUrlParams();
  setLang(currentLang);
  applyFontSize();
});

// Intercept clicks on Bizce, Anıltılar & Güncel nav links for instant list view switching without reload
document.addEventListener('click', function(e) {
  var a = e.target.closest('a');
  if (!a) return;
  var href = a.getAttribute('href');
  if (href && href.indexOf('blog.html') !== -1) {
    if (href.indexOf('type=anilts') !== -1 || href.indexOf('cat=anilts') !== -1) {
      e.preventDefault();
      try { window.history.pushState({}, '', href); } catch(err) {}
      switchSection('anilts');
    } else if (href.indexOf('type=guncel') !== -1 || href.indexOf('cat=guncel') !== -1) {
      e.preventDefault();
      try { window.history.pushState({}, '', href); } catch(err) {}
      switchSection('guncel');
    } else if (href.indexOf('type=bizce') !== -1 || href.indexOf('cat=bizce') !== -1) {
      e.preventDefault();
      try { window.history.pushState({}, '', href); } catch(err) {}
      switchSection('bizce');
    }
  }
});

window.addEventListener('popstate', function() {
  handleUrlParams();
});

/* --- Erişilebilirlik: Okuma Metni Boyutu Ölçekleme (Font Resizer) --- */
var currentFontOffset = parseInt(localStorage.getItem('msk_font_offset') || '0', 10);

function checkAndDetectDeviceVoices() {
  if (!synth) return;
  var voices = synth.getVoices();
  if (!voices || voices.length === 0) return;

  var langPrefix = (currentLang || 'tr').slice(0, 2).toLowerCase();
  var langVoices = voices.filter(function(v) {
    return v.lang.toLowerCase().startsWith(langPrefix);
  });

  var femaleKeywords = ['female', 'zira', 'yelda', 'seda', 'emel', 'filiz', 'dilara', 'ayşegül', 'gül', 'woman', 'lady'];
  var hasFemale = langVoices.some(function(v) {
    var lower = v.name.toLowerCase();
    return femaleKeywords.some(function(kw) { return lower.includes(kw); });
  });

  var genderSel = document.getElementById('voiceGender');
  if (genderSel && genderSel.options.length >= 2) {
    if (!hasFemale && langVoices.length > 0) {
      genderSel.options[1].text = (currentLang === 'ar' 
        ? '👩 امرأة (غير متوفر)' 
        : (currentLang === 'en' ? '👩 Female (Not on device)' : '👩 Kadın (Cihazınızda Yok)'));
    } else {
      genderSel.options[1].text = (currentLang === 'ar' ? '👩 امرأة' : (currentLang === 'en' ? '👩 Female' : '👩 Kadın'));
    }
  }
}

if (synth) {
  synth.onvoiceschanged = checkAndDetectDeviceVoices;
}

function applyFontSize() {
  var elContent = document.getElementById('readContent');
  if (!elContent) return;

  var basePx = 17; // base ~1.05rem
  var newPx = basePx + currentFontOffset;

  elContent.style.fontSize = newPx + 'px';
  elContent.style.lineHeight = Math.round(newPx * 1.65) + 'px';

  var subElements = elContent.querySelectorAll('p, li, span, blockquote, div');
  subElements.forEach(function(el) {
    el.style.fontSize = newPx + 'px';
    el.style.lineHeight = Math.round(newPx * 1.65) + 'px';
  });

  try {
    localStorage.setItem('msk_font_offset', currentFontOffset.toString());
  } catch(e) {}
}

function changeFontSize(delta) {
  var newOffset = currentFontOffset + delta;
  if (newOffset >= -6 && newOffset <= 12) { // Allow -6pt (shrink) up to +12pt (enlarge)
    currentFontOffset = newOffset;
    applyFontSize();
  }
}

function resetFontSize() {
  currentFontOffset = 0;
  applyFontSize();
}
