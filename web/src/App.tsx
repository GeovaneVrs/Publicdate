import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CatalogoPage } from "./pages/CatalogoPage";
import { ClimaPage } from "./pages/ClimaPage";
import { EconomiaPage } from "./pages/EconomiaPage";
import { EstadosPage } from "./pages/EstadosPage";
import { HomePage } from "./pages/HomePage";
import { InflacaoPage } from "./pages/InflacaoPage";
import { MunicipiosPage } from "./pages/MunicipiosPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="populacao/estados" element={<EstadosPage />} />
        <Route path="populacao/municipios" element={<MunicipiosPage />} />
        <Route path="economia" element={<EconomiaPage />} />
        <Route path="inflacao" element={<InflacaoPage />} />
        <Route path="clima" element={<ClimaPage />} />
        <Route path="catalogo" element={<CatalogoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
