
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { formatTime } from "./format.js";

const width = 1400;
const height = 750;
const INTERVAL_MS = 15 * 60 * 1000;

const chartRenderer = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: "#101827"
});

// ==========================================
// BASIS LABELS + RUNNING CANDLE QUESTION MARK
// ==========================================

const valueLabelsPlugin = {
  id: "basisValueLabels",

  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0].data;

    ctx.save();

    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((point, index) => {
      const value = values[index];

      // Running candle has no official Basis value.
      if (value === null || !Number.isFinite(Number(value))) {
        return;
      }

      const numericValue = Number(value);
      const label =
        `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(2)}%`;

      const offset = index % 2 === 0 ? -22 : 24;

      const y = Math.max(
        chartArea.top + 12,
        Math.min(chartArea.bottom - 12, point.y + offset)
      );

      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(
        point.x - textWidth / 2 - 5,
        y - 11,
        textWidth + 10,
        22
      );

      ctx.fillStyle =
        numericValue >= 0 ? "#4ade80" : "#fca5a5";

      ctx.fillText(label, point.x, y);
    });

    // Draw ? at the current running candle's x position.
    const lastIndex = chart.data.labels.length - 1;
    const x = chart.scales.x.getPixelForValue(lastIndex);

    const lastPoint = meta.data[lastIndex - 1];

    const y = lastPoint
      ? Math.max(
          chartArea.top + 28,
          Math.min(chartArea.bottom - 28, lastPoint.y)
        )
      : (chartArea.top + chartArea.bottom) / 2;

    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#facc15";
    ctx.fillText("?", x, y);

    ctx.restore();
  }
};

// ==========================================
// CREATE BASIS CHART
// ==========================================

export async function createBasisChart(symbol, candles) {
  const currentOpenTime =
    Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS;

  const labels = [
    ...candles.map(c => formatTime(c.openTime)),
    formatTime(currentOpenTime)
  ];

  const values = [
    ...candles.map(c => c.basisRate),
    null
  ];

  const colors = candles.map(v =>
    v.basisRate >= 0 ? "#22c55e" : "#ef4444"
  );

  const chartConfig = {
    type: "line",

    data: {
      labels,
      datasets: [
        {
          label: "Basis Rate (%)",
          data: values,
          borderColor: "#38bdf8",
          pointBackgroundColor: colors,
          pointBorderColor: colors,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
          tension: 0.15,
          fill: false,
          spanGaps: false
        }
      ]
    },

    plugins: [valueLabelsPlugin],

    options: {
      responsive: false,
      animation: false,

      layout: {
        padding: {
          top: 35,
          bottom: 15,
          left: 20,
          right: 35
        }
      },

      plugins: {
        title: {
          display: true,
          text: `${symbol}.P - BASIS RATE M15`,
          color: "#ffffff",
          font: {
            size: 26,
            weight: "bold"
          },
          padding: 25
        },

        // ==================================
        // CUSTOM LEGEND
        // ==================================

        legend: {
          display: true,
          position: "top",
          align: "center",

          labels: {
            color: "#ffffff",

            font: {
              size: 16
            },

            boxWidth: 18,
            boxHeight: 12,
            padding: 25,

            
generateLabels: () => [
  {
    text: "Basis Rate (%)",
    fillStyle: "#38bdf8",
    strokeStyle: "#38bdf8",
    fontColor: "#ffffff",
    lineWidth: 2,
    hidden: false
  },
  {
    text: "Futures > Index",
    fillStyle: "#22c55e",
    strokeStyle: "#22c55e",
    fontColor: "#ffffff",
    hidden: false
  },
  {
    text: "Futures < Index",
    fillStyle: "#ef4444",
    strokeStyle: "#ef4444",
    fontColor: "#ffffff",
    hidden: false
  },
  {
    text: "? Running Candle",
    fillStyle: "#facc15",
    strokeStyle: "#facc15",
    fontColor: "#ffffff",
    hidden: false
  }
]

          },

          onClick: () => {}
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#cbd5e1",
            maxRotation: 45,
            minRotation: 45
          },

          grid: {
            color: "#243247"
          },

          title: {
            display: true,
            text: "Time (VN)",
            color: "#ffffff"
          }
        },

        y: {
          grace: "12%",

          ticks: {
            color: "#cbd5e1",
            callback: value => `${value}%`
          },

          grid: {
            color: context =>
              context.tick.value === 0
                ? "#ffffff"
                : "#243247",

            lineWidth: context =>
              context.tick.value === 0 ? 2 : 1
          },

          title: {
            display: true,
            text: "Basis Rate (%)",
            color: "#ffffff"
          }
        }
      }
    }
  };

  return chartRenderer.renderToBuffer(chartConfig);
}
