import { Route, Routes } from "react-router-dom";
import LandingScreen from "./screens/Landing";
import ProjectScreen from "./screens/Project";
import EditorScreen from "./screens/Editor";
import AmendmentScreen from "./screens/Amendment";
import LoginScreen from "./screens/Login";
import RegisterScreen from "./screens/Register";
import MyProjectsScreen from "./screens/MyProjects";

export default function App() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/proiectele-mele" element={<MyProjectsScreen />} />
        <Route path="/proiect/:slug" element={<ProjectScreen />} />
        <Route path="/editor-nou" element={<EditorScreen mode="new" />} />
        <Route path="/editor/:slug" element={<EditorScreen mode="work" />} />
        <Route path="/amendament/:id" element={<AmendmentScreen />} />
        <Route path="*" element={<LandingScreen />} />
      </Routes>
    </div>
  );
}
