import { ArrowUpRight, BookOpen, HeartHandshake, Landmark, Play, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { IslamicPattern, MadinahPhoto, Reveal } from "./VisualPrimitives";

const metrics = [
  { value: "1,200+", label: "Students served" },
  { value: "35+", label: "Teachers & mentors" },
  { value: "12", label: "Years of service" },
];

const areas = [
  { title: "Quran education", body: "Recitation, Tajweed, Hifz support, and teacher feedback in one calm learning flow.", image: "/open-quran.jpg", tag: "Learn", href: "/quran" },
  { title: "Live classes", body: "Join guided lessons through YouTube Live or Google Meet when your class is active.", image: "/medina-domes.jpg", tag: "Connect", href: "/education" },
  { title: "Family guidance", body: "Values-led support for families, students, and the wider community.", image: "/quran-stand.jpg", tag: "Belong", href: "/about" },
  { title: "Zakat & giving", body: "Give with clarity and care through donation and Zakat tools.", image: "/kaaba.jpg", tag: "Support", href: "/donation" },
];

export default function HomeExperience() {
  return (
    <main className="site-page home-page">
      <div className="site-shell">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__aurora home-hero__aurora--one" aria-hidden="true" />
          <div className="home-hero__aurora home-hero__aurora--two" aria-hidden="true" />
          <div className="home-hero__gridlines" aria-hidden="true" />
          <div className="home-hero__wash" />
          <IslamicPattern tone="gold" className="home-hero__pattern" />
          <div className="home-hero__content">
            <Reveal className="home-hero__copy">
              <div className="home-hero__kicker"><Sparkles size={14} /> Faith · Knowledge · Community</div>
              <h1 id="home-title"><span>A place to</span><span><em>learn</em>, live,</span><span>and give well.</span></h1>
              <p className="home-hero__lead">Sunni Brothers Association brings Quran education, Islamic learning, family support, and community care into one welcoming digital home.</p>
              <div className="site-actions home-hero__actions">
                <Link href="/education" className="site-btn-primary">Explore education <ArrowUpRight size={17} /></Link>
                <Link href="/quran" className="site-btn-ghost">Read Quran <BookOpen size={16} /></Link>
              </div>
            </Reveal>
            <Reveal className="home-hero__scene" delay={0.16}>
              <MadinahPhoto />
            </Reveal>
          </div>
        </section>

        <Reveal className="home-ribbon" delay={0.08}>
          {metrics.map((metric) => <div className="home-ribbon__item" key={metric.label}><span className="home-ribbon__value">{metric.value}</span><span className="home-ribbon__label">{metric.label}</span></div>)}
        </Reveal>

        <section className="home-section" aria-labelledby="areas-title">
          <Reveal className="home-section__head">
            <div><div className="site-section-label">One connected community</div><h2 id="areas-title">Move between learning, worship, and service.</h2></div>
            <p>Everything important is close at hand, with enough stillness to learn, reflect, and serve.</p>
          </Reveal>
          <div className="home-bento">
            {areas.map((area, index) => (
              <Reveal key={area.title} delay={index * 0.06} className="home-bento__card">
                <Image src={area.image} alt="" fill sizes="(max-width: 800px) 100vw, 50vw" />
                <Link href={area.href} className="home-bento__content" aria-label={`Explore ${area.title}`}>
                  <div className="home-bento__tag">{area.tag}</div><h3>{area.title}</h3><p>{area.body}</p><ArrowUpRight className="home-bento__arrow" size={19} />
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="home-section home-editorial" aria-labelledby="story-title">
          <Reveal className="home-editorial__image"><Image src="/green-dome-minaret.jpg" alt="Green dome and minaret in Madinah" fill sizes="(max-width: 800px) 100vw, 45vw" /></Reveal>
          <Reveal className="home-editorial__copy" delay={0.08}>
            <div className="site-section-label">A digital home with a soul</div>
            <h2 id="story-title">Less noise. More meaning.</h2>
            <p>Inspired by the serenity of Madinah, this is a place for remembrance, learning, and sincere service to the community.</p>
            <div className="site-actions"><Link href="/about" className="site-btn-secondary">Our story <ArrowUpRight size={16} /></Link><Link href="/activities" className="site-btn-secondary">Community activities</Link></div>
          </Reveal>
        </section>

        <section className="home-section" aria-labelledby="next-title">
          <Reveal className="home-section__head"><div><div className="site-section-label">The everyday rhythm</div><h2 id="next-title">Small, useful moments that keep you connected.</h2></div><p>Start where you are: a class, a page of Quran, a calculation, or a contribution.</p></Reveal>
          <div className="site-grid-3">
            <Reveal className="site-card home-feature-card"><div className="home-feature-card__icon"><Play size={18} /></div><h3>Join a live class</h3><p className="site-copy">See upcoming and active lessons, then enter when your teacher opens the room.</p><Link href="/education" className="home-feature-card__link">See education <ArrowUpRight size={15} /></Link></Reveal>
            <Reveal className="site-card home-feature-card" delay={0.06}><div className="home-feature-card__icon"><Landmark size={18} /></div><h3>Make space for Quran</h3><p className="site-copy">A distraction-free reading flow with surah search and generous Arabic typography.</p><Link href="/quran" className="home-feature-card__link">Open Quran <ArrowUpRight size={15} /></Link></Reveal>
            <Reveal className="site-card home-feature-card" delay={0.12}><div className="home-feature-card__icon"><HeartHandshake size={18} /></div><h3>Give with purpose</h3><p className="site-copy">Choose a cause and support community work through a dignified, secure checkout.</p><Link href="/donation" className="home-feature-card__link">Support the work <ArrowUpRight size={15} /></Link></Reveal>
          </div>
        </section>

        <section className="home-section home-giving" aria-labelledby="giving-title">
          <IslamicPattern tone="light" />
          <h2 id="giving-title">Learn deeply. Serve generously. Stay close.</h2>
          <p>Join the Sunni Brothers Association community for education, family support, and meaningful giving.</p>
          <div className="site-actions"><Link href="/signup" className="site-btn-secondary">Create an account <ArrowUpRight size={16} /></Link><Link href="/donation" className="site-btn-ghost">Support the community</Link></div>
        </section>
      </div>
    </main>
  );
}
