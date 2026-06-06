import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Timeline from "@/pages/Timeline";
import AlbumDetail from "@/pages/AlbumDetail";
import Biography from "@/pages/Biography";
import MediaDetail from "@/pages/MediaDetail";
import Organize from "@/pages/Organize";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Timeline />} />
          <Route path="/organize" element={<Organize />} />
          <Route path="/albums/:albumId" element={<AlbumDetail />} />
          <Route path="/biography" element={<Biography />} />
          <Route path="/media/:id" element={<MediaDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}
