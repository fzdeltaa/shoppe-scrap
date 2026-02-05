# TT-Shoppe-Scrap

## Installation

### Install Dependencies

```bash
bun install
```

### Install ChromeDriver

```bash
bunx patchright install chrome
```

## Usage

### Run Shoppe Extract

```bash
bun run scrap-shp.ts searchname
```

**Example:**

```bash
bun run scrap-shp.ts kuda
bun run scrap-shp.ts 'kuda hitam'
```

### Run TikTok Extract

```bash
bun run scrap-tt.ts
```

Then just input what was asked.

### Scrap Product Details (slow aah)

This feature is used to get detail attributes. It loops through all columns. Use with caution.

```bash
bun run scrap-shp-product-details.ts csv filename
```

You need the CSV with the same format generated from `scrap-shp`.

**Example:**

```bash
bun run scrap-shp-product-details.ts shp-result_1770260359611.csv
bun run scrap-shp-product-details.ts 'shp-result_1770260359611 copy.csv'
```

**What will you get:**

Something like this on the end row:
```csv
"{""Formula Konsumsi"":""Kapsul"",""Berat Produk"":""50g"",""Tipe Paket"":""Paket Hemat"",""Fungsi Medis"":""Mata, Hidung, & Tenggorokan, Lainnya"",""Negara Asal"":""Indonesia"",""Golongan Obat"":""Herbal Terstandar"",""Masa Penyimpanan"":""48 Bulan"",""Kontraindikasi"":""Todak ada"",""Aturan Pakai"":""2 Kapsul5"",""Tanggal Kedaluwarsa"":""29-06-2029"",""No. Izin Edar (BPOM, PIRT)"":""699999"",""Jumlah Produk Dalam Kemasan"":""10 Bungkus"",""Efek Samping"":""Tidak ada""}"
```

## Configuration

If you're uncomfortable with Chrome running on your screen, just change `headless: true` to `headless: false` (can't guarantee what happens).

## FAQ

**Q: How do I stop scraping?**

A: Just press Ctrl + C.

**Q: Why is my browser doing something funny (e.g., blank, or something else)?**

A: Probably something to do with:

```js
const browser = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'patchright_profile'), {
    channel: 'chrome',
    headless: false,
    viewport: null,
  });
```

## About

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

### Install Patchright

```bash
bun install patchright
```
