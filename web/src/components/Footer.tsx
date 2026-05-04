export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 py-8 text-center text-sm text-slate-500">
      <p>
        Fontes: IBGE, Banco Central (SGS), Open-Meteo, amostra{" "}
        <a
          href="https://dados.gov.br"
          className="text-sky-400 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          dados.gov.br
        </a>
        . Uso educacional — respeite os termos de cada fonte.
      </p>
    </footer>
  );
}
