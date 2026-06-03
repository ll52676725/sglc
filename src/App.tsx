import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Timeline from "@/pages/Timeline";
import Albums from "@/pages/Albums";
import AlbumDetail from "@/pages/AlbumDetail";
import Upload from "@/pages/Upload";
import Biography from "@/pages/Biography";
import MediaDetail from "@/pages/MediaDetail";
import AIClassify from "@/pages/AIClassify";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Timeline />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/albums/:albumId" element={<AlbumDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/biography" element={<Biography />} />
          <Route path="/media/:id" element={<MediaDetail />} />
          <Route path="/ai-classify" element={<AIClassify />} />
        </Route>
      </Routes>
    </Router>
  );
}
