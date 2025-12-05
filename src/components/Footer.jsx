function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4 mt-8">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm">
        <p>Gestionale Marrel S.r.l. - by Andrii Prydryk</p>
        <p className="text-gray-400 text-xs mt-1">
          © {new Date().getFullYear()} - Tutti i diritti riservati
        </p>
      </div>
    </footer>
  );
}

export default Footer;