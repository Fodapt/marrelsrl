function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 md:left-64 bg-gray-800 text-white py-2 z-10">
      <div className="px-4 text-center text-xs">
        <p>Gestionale Marrel S.r.l. - by Andrii Prydryk © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}

export default Footer;