type AyahProps = { number: number; arabic: string; translation: string };

export default function Ayah({ number, arabic, translation }: AyahProps) {
  return (
    <article className="quran-ayah" aria-labelledby={`ayah-${number}`}>
      <div className="quran-ayah__number" id={`ayah-${number}`} aria-label={`Ayah ${number}`}>{number}</div>
      <p className="quran-ayah__arabic" dir="rtl" lang="ar">{arabic}</p>
      <p className="quran-ayah__translation" lang="en">{translation || "Translation unavailable for this ayah."}</p>
    </article>
  );
}
