import React from "react";
import { useNavigate } from "react-router-dom";
import "./Heatmaps.css";
import Heatmap from "./Heatmap";
import MainContentWrapper from "../../Layout/MainContentWrapper";
import PageHeader from "../../Layout/PageHeader";

function Heatmaps() {
  const navigate = useNavigate();

  return (
    <MainContentWrapper className="heatmaps-page">
      <PageHeader
        title="Heatmaps"
        onBack={() => navigate(-1)}
      />

      {/* CONTENT */}
      <div className="heatmaps-content">
        <Heatmap />
      </div>
    </MainContentWrapper>
  );
}

export default Heatmaps;
