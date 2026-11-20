
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { formatTime } from "./format.js";

const width = 1400;
const height = 750;

const INTERVAL_MS = 15 * 60 * 1000;

// Only display gaps outside +/-1%
const GAP_THRESHOLD = 1;

const chartRenderer = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: "#000000"
});

// ==========================================
// PRICE FORMAT
// ==========================================

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "N/A";
  }

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 8
  });
}

// ==========================================
// RUNNING CANDLE QUESTION MARK
// ==========================================

const runningCandlePlugin = {
  id: "priceRunningCandle",

  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;

    const lastIndex = chart.data.labels.length - 1;
    const x = chart.scales.x.getPixelForValue(lastIndex);

    const futuresMeta = chart.getDatasetMeta(0);
    const indexMeta = chart.getDatasetMeta(1);

    const futuresPoint = futuresMeta.data[lastIndex - 1];
    const indexPoint = indexMeta.data[lastIndex - 1];

    let y = (chartArea.top + chartArea.bottom) / 2;

    if (
      futuresPoint &&
      indexPoint &&
      Number.isFinite(futuresPoint.y) &&
      Number.isFinite(indexPoint.y)
    ) {
      y = (futuresPoint.y + indexPoint.y) / 2;
    }

    y = Math.max(
      chartArea.top + 28,
      Math.min(chartArea.bottom - 28, y)
    );

    ctx.save();

    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#facc15";

    ctx.fillText("?", x, y);

    ctx.restore();
  }
};

// ==========================================
// FUTURES VS INDEX GAP LABELS
// ==========================================

const priceGapPlugin = {
  id: "priceGapLabels",

  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;

    const futuresMeta = chart.getDatasetMeta(0);
    const indexMeta = chart.getDatasetMeta(1);

    const futuresValues = chart.data.datasets[0].data;
    const indexValues = chart.data.datasets[1].data;

    ctx.save();

    futuresValues.forEach((future, i) => {
      const index = indexValues[i];

      // Skip running candle or invalid values
      if (
        future === null ||
        index === null ||
        !Number.isFinite(future) ||
        !Number.isFinite(index) ||
        index <= 0
      ) {
        return;
      }

      // ==================================
      // BASIS RATE CALCULATION
      // ==================================

      const gap = ((future - index) / index) * 100;

      // Only display when Basis exceeds +/-1%
      if (Math.abs(gap) <= GAP_THRESHOLD) {
        return;
      }

      const futurePoint = futuresMeta.data[i];
      const indexPoint = indexMeta.data[i];

      if (!futurePoint || !indexPoint) {
        return;
      }

      const x = futurePoint.x;
      const y1 = futurePoint.y;
      const y2 = indexPoint.y;

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y1) ||
        !Number.isFinite(y2)
      ) {
        return;
      }

      // ==================================
      // VERTICAL DASHED CONNECTION
      // ==================================

      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;

      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();

      ctx.setLineDash([]);

      // ==================================
      // GAP LABEL
      // ==================================

      const label =
        `${gap > 0 ? "+" : ""}${gap.toFixed(2)}%`;

      const midY = (y1 + y2) / 2;

      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textWidth = ctx.measureText(label).width;

      const labelY = Math.max(
        chartArea.top + 12,
        Math.min(chartArea.bottom - 12, midY)
      );

      // Dark background behind label
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";

      ctx.fillRect(
        x - textWidth / 2 - 5,
        labelY - 11,
        textWidth + 10,
        22
      );

      // Green: Futures > Index
      // Red: Futures < Index
      ctx.fillStyle =
        gap > 0 ? "#4ade80" : "#fca5a5";

      ctx.fillText(label, x, labelY);
    });

    ctx.restore();
  }
};

// ==========================================
// CREATE FUTURES VS INDEX CHART
// ==========================================

export async function createPriceChart(
  symbol,
  candles,
  currentOpenTime =
    Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS
) {
  const labels = [
    ...candles.map(c => formatTime(c.openTime)),
    formatTime(currentOpenTime)
  ];

  const futuresPrices = [
    ...candles.map(c => c.futuresPrice),
    null
  ];

  const indexPrices = [
    ...candles.map(c => c.indexPrice),
    null
  ];

  const chartConfig = {
    type: "line",

    data: {
      labels,

      datasets: [
        // ==================================
        // FUTURES PRICE
        // ==================================

        {
          label: "Futures Price",
          data: futuresPrices,

          borderColor: "#38bdf8",
          backgroundColor: "#38bdf8",

          pointBackgroundColor: "#38bdf8",
          pointBorderColor: "#38bdf8",

          pointRadius: 5,
          pointHoverRadius: 7,

          borderWidth: 3,
          tension: 0.15,

          fill: false,
          spanGaps: false
        },

        // ==================================
        // INDEX PRICE
        // ==================================

        {
          
  label: "Index Price",
  data: indexPrices,

  borderColor: "#ffffff",
  backgroundColor: "#ffffff",

  pointBackgroundColor: "#ffffff",
  pointBorderColor: "#ffffff",

          pointRadius: 5,
          pointHoverRadius: 7,

          borderWidth: 3,
          tension: 0.15,

          fill: false,
          spanGaps: false
        }
      ]
    },

    plugins: [
      runningCandlePlugin,
      priceGapPlugin
    ],

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
        // ==================================
        // TITLE
        // ==================================

        title: {
          display: true,
          text: `${symbol}.P - FUTURES VS INDEX M15`,

          color: "#ffffff",

          font: {
            size: 26,
            weight: "bold"
          },

          padding: 25
        },

        // ==================================
        // LEGEND
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
                text: "Futures Price",
                fillStyle: "#38bdf8",
                strokeStyle: "#38bdf8",
                fontColor: "#ffffff",
                hidden: false
              },
              {
  text: "Index Price",
  fillStyle: "#ffffff",
  strokeStyle: "#ffffff",
  fontColor: "#ffffff",
  hidden: false
},
              {
                text: "Gap > +/-1%",
                fillStyle: "#94a3b8",
                strokeStyle: "#94a3b8",
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
        },

        // ==================================
        // TOOLTIP
        // ==================================

        tooltip: {
          callbacks: {
            label: context => {
              const value = context.parsed.y;

              return (
                `${context.dataset.label}: ` +
                `${formatPrice(value)} USDT`
              );
            }
          }
        }
      },

      scales: {
        // ==================================
        // X AXIS
        // ==================================

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

        // ==================================
        // Y AXIS
        // ==================================

        y: {
          ticks: {
            color: "#cbd5e1",
            callback: value => formatPrice(value)
          },

          grid: {
            color: "#243247"
          },

          title: {
            display: true,
            text: "Price (USDT)",
            color: "#ffffff"
          }
        }
      }
    }
  };

  return chartRenderer.renderToBuffer(chartConfig);
}
