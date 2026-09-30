import { Head, Link } from '@inertiajs/react';
import GuestLayout from '../Layouts/GuestLayout';
import { ShopProvider, useShop } from '../Components/Storefront/ShopContext';
import Icon from '../Components/Storefront/Icon';
import { marketHref } from '../Components/Storefront/catalog';
import { useState } from 'react';

function AboutPage() {
    const { filipino } = useShop();
    const [openFaq, setOpenFaq] = useState(null);

    const toggleFaq = (index) => setOpenFaq(openFaq === index ? null : index);

    const faqs = [
        {
            q: filipino ? 'Ano ang AgriFarm Pasig?' : 'What is AgriFarm Pasig?',
            a: filipino 
                ? 'Ang AgriFarm Pasig ay isang digital na pamilihan na idinisenyo upang direktang ikonekta ang mga lokal na urban farmers ng Pasig City sa mga mamimili. Ito ay pinamamahalaan ng lokal na pamahalaan at CENRO.'
                : 'AgriFarm Pasig is a digital marketplace designed to directly connect Pasig City\'s local urban farmers with citizens. It is managed by the local government and CENRO.'
        },
        {
            q: filipino ? 'Sino ang maaaring sumali sa inisyatiba?' : 'Can anyone join the initiative?',
            a: filipino
                ? 'Sinumang asosasyon ng komunidad, paaralan, o rehistradong urban farmer sa Pasig City ay maaaring sumali at mag-alok ng kanilang ani. Makipag-ugnayan sa CENRO para sa mga kinakailangan sa pagpaparehistro.'
                : 'Any community association, school, or registered urban farmer in Pasig City can join and offer their produce. Contact CENRO for registration requirements.'
        },
        {
            q: filipino ? 'Paano ako makakapagsimula ng hardin sa aming komunidad?' : 'How do I start a garden in my community?',
            a: filipino
                ? 'Para makapagsimula ng sarili ninyong urban garden, maaari kayong bumisita sa Pasig City Hall CENRO Office. Nag-aalok sila ng suporta sa pagsasanay, buto, at kagamitan.'
                : 'To start your own urban garden, you can visit the Pasig City Hall CENRO Office. They offer support in terms of training, seeds, and equipment.'
        },
        {
            q: filipino ? 'Anong mga uri ng produkto ang itinatanim?' : 'What types of produce are grown?',
            a: filipino
                ? 'Iba-iba ito depende sa panahon, ngunit karaniwang kasama rito ang Pechay, Mustasa, Kamatis, Talong, at iba\'t ibang herbal na halaman.'
                : 'It varies by season, but typically includes Pechay, Mustard greens, Tomatoes, Eggplants, and various culinary herbs.'
        },
        {
            q: filipino ? 'Sino ang namamahala sa mga urban farms?' : 'Who manages the urban farms?',
            a: filipino
                ? 'Ang mga ito ay pinapanatili ng inyong mga lokal na opisyal ng barangay, mga guro sa pampublikong paaralan, at mga dedikadong boluntaryo ng komunidad sa ilalim ng programa ng CENRO.'
                : 'They are maintained by your local barangay officials, public school teachers, and dedicated community volunteers under the guidance of CENRO.'
        }
    ];

    return (
        <GuestLayout storefront market={false}>
            <Head>
                <title>{filipino ? 'Tungkol sa Amin - AgriFarm' : 'About Us - AgriFarm'}</title>
                <meta name="description" content={filipino ? 'Alamin ang kwento ng AgriFarm Pasig, ang aming misyon, at kung paano gumagana ang urban farming marketplace na ito.' : 'Learn about the story of AgriFarm Pasig, our mission, and how this urban farming marketplace works.'} />
            </Head>

            <main className="about-page">
                {/* Hero Section */}
                <section className="about-hero" aria-labelledby="about-heading">
                    <img
                        className="about-hero-photo"
                        src="/images/market-hero-v2.png"
                        alt="A lush community garden in Pasig"
                        fetchPriority="high"
                    />
                    <div className="about-hero-overlay" aria-hidden="true" />
                    <div className="store-container about-hero-inner">
                        <div className="about-hero-copy">
                            <h1 id="about-heading">
                                {filipino ? 'Naglilinang ng Mas Luntian at Malusog na Pasig' : 'Cultivating a Greener, Healthier Pasig'}
                            </h1>
                            <p>
                                {filipino 
                                    ? 'Sumali sa AgriFarm Pasig sa pagbabago ng mga bakanteng espasyo sa lungsod upang maging masaganang taniman ng komunidad para sa seguridad sa pagkain at mas luntiang kapaligiran.' 
                                    : 'Join AgriFarm Pasig in transforming urban spaces into productive community gardens for food security and a greener environment.'}
                            </p>
                            <Link href={marketHref()} className="store-button lime-button" style={{ marginTop: '20px' }}>
                                {filipino ? 'Tingnan ang Pamilihan' : 'Browse Marketplace'}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Our Journey Section (Now Split Layout with Image) */}
                <section className="store-container about-story-split">
                    <div className="about-story-text">
                        <div className="about-eyebrow">{filipino ? 'ANG AMING KWENTO' : 'OUR JOURNEY'}</div>
                        <h2>{filipino ? 'Mula sa mga Bakanteng Lupa Tungo sa Masaganang Hardin' : 'From Empty Lots to Thriving Gardens'}</h2>
                        <p><strong>{filipino ? 'Ang AgriFarm Pasig ay isang nakakapagbagong hakbang para sa urban farming sa Pilipinas.' : 'AgriFarm Pasig is a transforming initiative for urban farming in the Philippines.'}</strong></p>
                        <p>
                            {filipino 
                                ? 'Naitatag sa pamamagitan ng Pasig City Government at CENRO, ang aming programa ay layuning bigyang-lakas ang mga komunidad, itaguyod ang napapanatiling agrikultura, at pagbutihin ang access sa masustansyang pagkain sa mga urban na lugar.' 
                                : 'Established by the Pasig City Government and CENRO, our program aims to empower communities, promote sustainable agriculture, and enhance food access in urban areas.'}
                        </p>
                        <p>
                            {filipino 
                                ? 'Nagsimula ang aming kwento sa isang simpleng pangarap na magamit ang mga nakatiwangwang na lupa at magpalago ng mga luntiang espasyo sa buong lungsod. Naniniwala kami sa kapangyarihan ng urban farming na pag-isahin ang mga tao at bumuo ng mas matibay at napapanatiling Pasig.' 
                                : 'Our story began with a simple vision to utilize unused land and foster green spaces throughout the city. We believe in the power of urban farming to unite people and build a more resilient and sustainable Pasig.'}
                        </p>
                    </div>
                                        <div className="about-story-image-grid">
                        <img src="/images/pasig-urban-garden.jpg" alt="Pasig community garden beds" />
                        <img src="/images/pasig-planting-3.jpg" alt="Planting seedlings" />
                        <img src="/images/pasig-planting-1.png" alt="Community working in garden" />
                        <img src="/images/pasig-planting-2.jpg" alt="Local leaders planting" />
                        
                    </div>
                </section>

                {/* Visual Break Banner */}
                <div className="about-banner-break">
                    <img src="/images/agrifarm-market-hero.png" alt="Fresh harvest background" className="banner-bg" />
                    <div className="banner-content">
                        <h2>{filipino ? 'Sariwang Ani Mula Sa Kapwa Mo PasigueÃ±o' : 'Fresh Harvests From Your Neighbors'}</h2>
                    </div>
                </div>

                                {/* Mission and Vision Section */}
                <section className="store-container about-mission-vision">
                    <div className="about-eyebrow">PURPOSE</div>
                    <h2>Mission and Vision</h2>
                    <p className="about-subtitle">{filipino ? 'Ang aming pangunahing layunin at trabaho ay gabay ng aming pananaw.' : 'Our core work is guided by our mission and vision.'}</p>
                    
                    <div className="about-cards">
                        <div className="about-card standard-card">
                            <div className="card-image-box">
                                <img src="/images/market-basket.png" alt="Basket of vegetables" />
                            </div>
                            <div className="card-text-box">
                                <h3>Our Mission</h3>
                                <p>
                                    {filipino 
                                        ? 'Upang lumikha, suportahan, at panatilihin ang isang network ng mga naa-access na urban farms na nagbibigay ng sariwa at lokal na ani para sa mga residente ng Pasig.'
                                        : 'To create, support, and sustain a network of accessible urban farms that provide fresh, local produce to Pasig residents.'}
                                </p>
                            </div>
                        </div>
                        <div className="about-card standard-card">
                            <div className="card-image-box">
                                <img src="/images/market-pechay-feature.png" alt="Fresh green pechay" />
                            </div>
                            <div className="card-text-box">
                                <h3>Our Vision</h3>
                                <p>
                                    {filipino 
                                        ? 'Isang masigla at napapanatiling Pasig kung saan bawat komunidad ay may access sa isang luntiang espasyo para sa pagpapalago ng pagkain at pagkakaisa.'
                                        : 'A vibrant and sustainable Pasig where every community has access to a green space for growing food, fostering health, unity, and resilience.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it Works Section */}
                <section className="about-process-wrapper">
                    <div className="store-container about-process">
                        <div className="about-eyebrow">{filipino ? 'MGA HAKBANG' : 'STEPS'}</div>
                        <h2>{filipino ? 'Paano Ito Gumagana' : 'How It Works'}</h2>
                        <p className="about-subtitle">{filipino ? 'Ang aming pangunahing proseso sa pagpapatupad ng mga pamamaraan ng urban agriculture.' : 'Our core process in implementing urban agriculture techniques.'}</p>

                        <div className="process-steps">
                            <div className="process-step">
                                <div className="process-icon">1</div>
                                <h4>{filipino ? 'PAGTUKOY' : 'IDENTIFICATION'}</h4>
                                <p>{filipino ? 'Paghahanap at pagsusuri ng mga bakanteng espasyo na angkop para gawing taniman.' : 'Locate and assess vacant urban spaces suitable for conversion.'}</p>
                            </div>
                            <div className="process-step">
                                <div className="process-icon">2</div>
                                <h4>{filipino ? 'PARTISIPASYON NG KOMUNIDAD' : 'COMMUNITY ENGAGEMENT'}</h4>
                                <p>{filipino ? 'Pagsasanay at pagpapakilos sa mga lokal na residente upang panatilihin at anihin ang mga hardin.' : 'Train and mobilize local residents to maintain and harvest gardens.'}</p>
                            </div>
                            <div className="process-step">
                                <div className="process-icon">3</div>
                                <h4>{filipino ? 'NAPAPANATILING PAGSASAKA' : 'SUSTAINABLE FARMING'}</h4>
                                <p>{filipino ? 'Pagpapatupad ng mga teknika sa urban agriculture upang magpalago ng organikong ani.' : 'Implement urban agriculture techniques to grow organic produce.'}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQs Section */}
                <section className="store-container about-faqs">
                    <div className="about-eyebrow">FAQ</div>
                    <h2>{filipino ? 'Mga Madalas Itanong' : 'Frequently Asked Questions'}</h2>
                    <div className="faq-list">
                        {faqs.map((faq, index) => (
                            <div key={index} className={`faq-item ${openFaq === index ? 'open' : ''}`}>
                                <button className="faq-question" onClick={() => toggleFaq(index)} aria-expanded={openFaq === index}>
                                    <span>{faq.q}</span>
                                    <Icon name={openFaq === index ? 'minus' : 'plus'} size={20} />
                                </button>
                                {openFaq === index && (
                                    <div className="faq-answer">
                                        <p>{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </GuestLayout>
    );
}

export default function About() {
    return (
        <ShopProvider>
            <AboutPage />
        </ShopProvider>
    );
}