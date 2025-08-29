/**
 * @component SkeletonCard
 *
 * Vizuelni placeholder tokom ucitavanja postova.
 * Koristi se u Top 3 i drugim grid prikazima da zadrzi layout
 * dok podaci ne stignu iz Firestore-a.
 *
 * - Neutralne sivo obojene trake simuliraju naslov, opis i badzeve
 * - animate-pulse za efekat "disanja"
 * - Obezbedjuje stabilan raspored bez skakanja layouta
 *
 * @returns {JSX.Element}
 */

export default function SkeletonCard() {
  return (
    <div className="bg-white shadow rounded p-4 animate-pulse">
      {/* Naslov placeholder */}
      <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
      {/* Opis placeholder, 2 reda */}
      <div className="h-4 w-full bg-gray-200 rounded mb-1" />
      <div className="h-4 w-5/6 bg-gray-200 rounded mb-4" />
      {/* Badges placeholder */}
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-gray-200 rounded" />
        <div className="h-5 w-16 bg-gray-200 rounded" />
      </div>
      {/* Counter placeholder */}
      <div className="h-4 w-10 bg-gray-200 rounded mt-3" />
    </div>
  );
}
