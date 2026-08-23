"use client";

import { BookOpenText, List, LoaderCircle, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Ayah from "./Ayah";

type SurahMeta = { number: number; name: string; englishName: string; englishNameTranslation: string; revelationType: string; numberOfAyahs: number };
type AyahRow = { numberInSurah: number; arabic: string; translation: string };
type EditionAyah = { numberInSurah: number; text: string };
type EditionData = { edition?: { language?: string }; ayahs?: EditionAyah[] };
type SurahListResponse = { data?: SurahMeta[] };
type AyahEditionsResponse = { data?: EditionData[] };

const fallbackSurahList: SurahMeta[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Fatihah", englishNameTranslation: "The Opening", revelationType: "Meccan", numberOfAyahs: 7 },
  { number: 2, name: "البقرة", englishName: "Al-Baqarah", englishNameTranslation: "The Cow", revelationType: "Medinan", numberOfAyahs: 286 },
  { number: 3, name: "آل عمران", englishName: "Ali 'Imran", englishNameTranslation: "Family of Imran", revelationType: "Medinan", numberOfAyahs: 200 },
  { number: 36, name: "يس", englishName: "Ya-Sin", englishNameTranslation: "Ya Sin", revelationType: "Meccan", numberOfAyahs: 83 },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahman", englishNameTranslation: "The Most Compassionate", revelationType: "Medinan", numberOfAyahs: 78 },
  { number: 67, name: "الملك", englishName: "Al-Mulk", englishNameTranslation: "The Sovereignty", revelationType: "Meccan", numberOfAyahs: 30 },
  { number: 112, name: "الإخلاص", englishName: "Al-Ikhlas", englishNameTranslation: "Sincerity", revelationType: "Meccan", numberOfAyahs: 4 },
];

export default function QuranExperience() {
  const [surahs, setSurahs] = useState<SurahMeta[]>(fallbackSurahList);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<"reader" | "list">("reader");
  const readerRef = useRef<HTMLElement | null>(null);
  const [ayahs, setAyahs] = useState<AyahRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [ayahLoading, setAyahLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [ayahError, setAyahError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSurahs() {
      setListLoading(true);
      setListError("");
      try {
        const response = await fetch("https://api.alquran.cloud/v1/surah", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed");
        const json: SurahListResponse = await response.json();
        const items = Array.isArray(json?.data) ? json.data : [];
        if (!items.length) throw new Error("Empty");
        if (!cancelled) setSurahs(items);
      } catch {
        if (!cancelled) setListError("Unable to load the full Quran index right now. A useful fallback list is shown.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }
    loadSurahs();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAyahs() {
      setAyahLoading(true);
      setAyahError("");
      try {
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/editions/quran-uthmani,en.asad`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed");
        const json: AyahEditionsResponse = await response.json();
        const payload = Array.isArray(json?.data) ? json.data : [];
        const arabicEdition = payload.find((item) => item?.edition?.language === "ar");
        const englishEdition = payload.find((item) => item?.edition?.language === "en");
        const arabicAyahs = Array.isArray(arabicEdition?.ayahs) ? arabicEdition.ayahs : [];
        const englishAyahs = Array.isArray(englishEdition?.ayahs) ? englishEdition.ayahs : [];
        const englishMap = new Map(englishAyahs.map((ayah) => [ayah.numberInSurah, ayah.text]));
        const merged = arabicAyahs.map((ayah) => ({ numberInSurah: ayah.numberInSurah, arabic: ayah.text, translation: englishMap.get(ayah.numberInSurah) ?? "" }));
        if (!merged.length) throw new Error("Empty");
        if (!cancelled) setAyahs(merged);
      } catch {
        if (!cancelled) { setAyahs([]); setAyahError("Unable to load ayahs at the moment. Please try another Surah or refresh."); }
      } finally {
        if (!cancelled) setAyahLoading(false);
      }
    }
    loadAyahs();
    return () => { cancelled = true; };
  }, [selectedSurah]);

  const filteredSurahs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return surahs;
    return surahs.filter((surah) => surah.englishName.toLowerCase().includes(normalizedQuery) || surah.englishNameTranslation.toLowerCase().includes(normalizedQuery) || surah.name.includes(query) || surah.number.toString() === normalizedQuery);
  }, [query, surahs]);
  const activeSurah = useMemo(() => surahs.find((surah) => surah.number === selectedSurah) ?? fallbackSurahList[0], [surahs, selectedSurah]);

  function openSurah(surahNumber: number) {
    setSelectedSurah(surahNumber);
    setMobileView("reader");
    window.setTimeout(() => readerRef.current?.scrollIntoView({ block: "start" }), 80);
  }

  return (
    <main className="quran-page">
      <div className="quran-shell">
        <header className="quran-intro">
          <div className="site-section-label">The Holy Quran</div>
          <h1>Read with stillness and attention.</h1>
          <p>Choose a Surah and read the Arabic text alongside its English translation. Where remembrance lives, the heart finds peace.</p>
        </header>

        <div className="quran-mobile-tabs" role="group" aria-label="Quran view">
          <button type="button" aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")}><List size={17} /> Surahs</button>
          <button type="button" aria-pressed={mobileView === "reader"} onClick={() => setMobileView("reader")}><BookOpenText size={17} /> Reading</button>
        </div>

        <div className="quran-workspace">
          <aside className={`quran-library ${mobileView === "reader" ? "quran-library--mobile-hidden" : ""}`} aria-label="Surah navigation">
            <div className="quran-library__head"><div><span className="quran-overline">Surah index</span><h2>Choose a Surah</h2></div>{!listLoading ? <span>{filteredSurahs.length}</span> : null}</div>
            <label className="quran-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search Surahs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or number" type="search" /></label>
            {listError ? <p className="quran-notice" role="status">{listError}</p> : null}
            <nav className="quran-surah-list" aria-label="Surahs">
              {listLoading && surahs.length === 0 ? <p className="quran-loading"><LoaderCircle size={17} /> Loading Surahs…</p> : null}
              {!listLoading && filteredSurahs.length === 0 ? <p className="quran-empty">No Surah matches “{query}”.</p> : null}
              {filteredSurahs.map((surah) => {
                const active = surah.number === selectedSurah;
                return <button key={surah.number} type="button" className="quran-surah" aria-current={active ? "true" : undefined} onClick={() => openSurah(surah.number)}><span className="quran-surah__number">{surah.number}</span><span className="quran-surah__name"><strong>{surah.englishName}</strong><small>{surah.englishNameTranslation} · {surah.numberOfAyahs} ayahs</small></span><span className="quran-surah__arabic" lang="ar" dir="rtl">{surah.name}</span></button>;
              })}
            </nav>
          </aside>

          <section ref={readerRef} className={`quran-reader ${mobileView === "list" ? "quran-reader--mobile-hidden" : ""}`} aria-labelledby="surah-title">
            <header className="quran-reader__head">
              <div><span className="quran-overline">Surah {activeSurah.number}</span><h2 id="surah-title">{activeSurah.englishName}</h2><p>{activeSurah.englishNameTranslation} · {activeSurah.revelationType}</p></div>
              <div className="quran-reader__arabic"><span lang="ar" dir="rtl">{activeSurah.name}</span><small>{activeSurah.numberOfAyahs} ayahs</small></div>
            </header>
            <div className="quran-reader__body" aria-live="polite" aria-busy={ayahLoading}>
              {ayahError ? <p className="quran-notice" role="alert">{ayahError}</p> : null}
              {ayahLoading ? <p className="quran-loading"><LoaderCircle size={18} /> Loading ayahs…</p> : null}
              {!ayahLoading && !ayahError ? ayahs.map((ayah) => <Ayah key={ayah.numberInSurah} number={ayah.numberInSurah} arabic={ayah.arabic} translation={ayah.translation} />) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
