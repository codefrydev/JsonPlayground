import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SeoHead from "./components/SeoHead";
import Home from "./pages/Home";
import JsonPage from "./pages/JsonPage";
import XamlPage from "./pages/XamlPage";
import XamlToJsonPage from "./pages/XamlToJsonPage";
import JsonToXamlPage from "./pages/JsonToXamlPage";
import YamlPage from "./pages/YamlPage";
import YamlToJsonPage from "./pages/YamlToJsonPage";
import JsonToYamlPage from "./pages/JsonToYamlPage";
import CsvPage from "./pages/CsvPage";
import CsvToJsonPage from "./pages/CsvToJsonPage";
import JsonToCsvPage from "./pages/JsonToCsvPage";
import TomlPage from "./pages/TomlPage";
import TomlToJsonPage from "./pages/TomlToJsonPage";
import JsonToTomlPage from "./pages/JsonToTomlPage";
import XmlToJsonPage from "./pages/XmlToJsonPage";
import JsonToXmlPage from "./pages/JsonToXmlPage";
import EnvPage from "./pages/EnvPage";
import EnvToJsonPage from "./pages/EnvToJsonPage";
import JsonToEnvPage from "./pages/JsonToEnvPage";
import JwtPage from "./pages/JwtPage";
import JsonGeneratorPage from "./pages/JsonGeneratorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <SeoHead />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/json" element={<JsonPage />} />
          <Route path="/xaml" element={<XamlPage />} />
          <Route path="/xaml-to-json" element={<XamlToJsonPage />} />
          <Route path="/json-to-xaml" element={<JsonToXamlPage />} />
          <Route path="/yaml" element={<YamlPage />} />
          <Route path="/yaml-to-json" element={<YamlToJsonPage />} />
          <Route path="/json-to-yaml" element={<JsonToYamlPage />} />
          <Route path="/csv" element={<CsvPage />} />
          <Route path="/csv-to-json" element={<CsvToJsonPage />} />
          <Route path="/json-to-csv" element={<JsonToCsvPage />} />
          <Route path="/toml" element={<TomlPage />} />
          <Route path="/toml-to-json" element={<TomlToJsonPage />} />
          <Route path="/json-to-toml" element={<JsonToTomlPage />} />
          <Route path="/xml-to-json" element={<XmlToJsonPage />} />
          <Route path="/json-to-xml" element={<JsonToXmlPage />} />
          <Route path="/env" element={<EnvPage />} />
          <Route path="/env-to-json" element={<EnvToJsonPage />} />
          <Route path="/json-to-env" element={<JsonToEnvPage />} />
          <Route path="/jwt" element={<JwtPage />} />
          <Route path="/json-generator" element={<JsonGeneratorPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
