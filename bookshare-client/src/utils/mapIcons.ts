import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export const userLocationIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
  html: `
    <div style="
      width:22px;height:22px;border-radius:9999px;
      background:#2563eb;
      border:3px solid #ffffff;
      box-shadow:0 10px 22px rgba(37,99,235,.28), 0 1px 2px rgba(15,23,42,.18);
      position:relative;
    ">
      <div style="
        position:absolute;inset:-10px;
        border-radius:9999px;
        background:rgba(37,99,235,.12);
      "></div>
    </div>
  `,
});

export const ownerIcon = L.divIcon({
  className: "",
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  popupAnchor: [0, -34],
  html: `
    <div style="position:relative;width:28px;height:36px;">
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 35C14 35 26 22.9 26 14C26 7.37258 20.6274 2 14 2C7.37258 2 2 7.37258 2 14C2 22.9 14 35 14 35Z"
          fill="#f97316" stroke="#ffffff" stroke-width="2.6" />
        <circle cx="14" cy="14" r="6.2" fill="#ffffff" opacity="0.96"/>
        <path d="M11.2 11.6h5.6c.7 0 1.2.5 1.2 1.2v6.4c0 .7-.5 1.2-1.2 1.2h-5.6c-.7 0-1.2-.5-1.2-1.2v-6.4c0-.7.5-1.2 1.2-1.2Z"
          fill="#f97316"/>
        <path d="M12.6 13.4h2.8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M12.6 15.6h2.8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;left:3px;right:3px;bottom:2px;height:12px;border-radius:9999px;background:rgba(15,23,42,.22);filter:blur(7px);"></div>
    </div>
  `,
});

export const meetupIcon = L.divIcon({
  className: "",
  iconSize: [24, 30],
  iconAnchor: [12, 28],
  popupAnchor: [0, -28],
  html: `
    <div style="position:relative;width:24px;height:30px;">
      <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 29C12 29 22 18.8 22 11.7C22 6.34 17.52 2 12 2C6.48 2 2 6.34 2 11.7C2 18.8 12 29 12 29Z"
          fill="#0ea5e9" stroke="#ffffff" stroke-width="2.2"/>
        <circle cx="12" cy="12" r="4.4" fill="#ffffff"/>
      </svg>
      <div style="position:absolute;left:3px;right:3px;bottom:1px;height:8px;border-radius:9999px;background:rgba(15,23,42,.2);filter:blur(5px);"></div>
    </div>
  `,
});

