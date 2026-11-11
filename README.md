# mini GameHub — Mini Game Arena 2.1

مجموعه بازی وب فارسی، راست‌چین و واکنش‌گرا با چهار بازی مستقل در یک رابط واحد. این نسخه مخصوصاً دو بازی آرکید Snake و Brick Breaker را از نظر گیم‌پلی، فیزیک، کنترل و جلوه‌های Canvas ارتقا می‌دهد.

## بازی‌ها

- **دوز (Tic-Tac-Toe):** دونفره یا مقابل هوش مصنوعی با سه درجه سختی؛ سطح حرفه‌ای از Minimax استفاده می‌کند.
- **سنگ، کاغذ، قیچی:** فقط مقابل هوش مصنوعی، با سه سطح آسان، متوسط و هوشمند.
- **مار نئونی (Snake) — Arcade 2.1:** حلقه بازی `requestAnimationFrame` با شبیه‌سازی fixed-step و رندر interpolated، سه سرعت قابل انتخاب، افزایش تدریجی سرعت و Level، میوه طلایی با امتیاز اضافه، کمبو، ذرات و متن امتیاز شناور، رکورد محلی، مکث/ادامه، کیبورد و کنترل لمسی.
- **آجرشکن (Brick Breaker) — Arcade 2.1:** فیزیک مبتنی بر delta-time، زیرگام‌گذاری برخورد برای کاهش عبور توپ از آجرها، آجرهای زرهی، مرحله‌بندی، چندتوپی، کمبو و ضریب امتیاز، پاورآپ‌های پدل عریض/توپ آهسته/چندتوپی/جان اضافه، ذرات انفجار، لرزش صحنه، trail توپ، کنترل موس/لمس/کیبورد و رکورد محلی.

## ویژگی‌های مشترک

- HTML، CSS و JavaScript جداگانه؛ بدون فریم‌ورک یا وابستگی npm.
- طراحی تیره نئونی، رابط فارسی RTL و واکنش‌گرا.
- صدای تولیدشده با Web Audio و قابل خاموش‌کردن.
- امتیازها و رکوردهای محلی در `localStorage` ذخیره می‌شوند.
- بازی‌ها سمت مرورگر اجرا می‌شوند و برای Cloudflare Pages به Backend نیاز ندارند.

## ساختار پروژه

```text
mini-gamehub/
├── index.html
├── styles.css
├── app.js
├── README.md
└── .gitignore
```

## اجرای محلی در Linux Mint

در ریشه پروژه اجرا کن:

```bash
python3 -m http.server 8000
```

سپس `http://localhost:8000` را در مرورگر باز کن. برای توقف وب‌سرور `Ctrl+C` بزن.

## انتشار روی Cloudflare Pages از GitHub

- **Production branch:** `main`
- **Framework preset:** `None`
- **Build command:** `exit 0`
- **Build output directory:** `.` (ریشه مخزن)

پس از Push به شاخه `main`، Git Integration در Cloudflare Pages به‌صورت خودکار Deploy جدید می‌سازد.

## انتشار تغییرات

```bash
git add index.html styles.css app.js README.md .gitignore
git commit -m "Upgrade Snake and Brick Breaker arcade gameplay"
git push origin main
```

## ذخیره‌سازی

امتیازها و رکوردها در همان مرورگر و دستگاه ذخیره می‌شوند؛ بین مرورگرها یا دستگاه‌های مختلف همگام نیستند. برای حساب کاربری و جدول رتبه‌بندی سراسری به Backend نیاز است.
