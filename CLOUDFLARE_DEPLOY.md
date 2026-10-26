# ☁️ 바이브덤프(VibeDump) Cloudflare 배포 가이드

Cloudflare는 **전 세계 글로벌 엣지 네트워크**에서 영구적으로 구동되므로, **서버가 잠들지 않고(Scale-to-zero 콜드슬립 없음), 재배포 시에도 데이터가 100% 영구 보존**됩니다.

---

## 🚀 빠른 배포 방법 (Cloudflare Pages + D1 Database)

### 1단계: Cloudflare D1 영구 데이터베이스 생성
터미널에서 아래 명령어로 Cloudflare의 영구 SQLite 데이터베이스(D1)를 생성합니다:

```bash
# 1. D1 데이터베이스 생성
npx wrangler d1 create vibedump-db
```
*실행 후 터미널에 나타나는 `database_id`를 복사하여 `wrangler.toml`의 `database_id = "..."`에 넣어주세요.*

---

### 2단계: 데이터베이스 스키마 및 초기 태그/카테고리 적용
프로젝트 루트에 준비된 `schema.sql`을 실행하여 영구 DB 테이블과 카테고리 12개, 우선 태그 14개를 즉시 생성합니다:

```bash
# 원격 Cloudflare D1에 테이블 및 초기 데이터 적용
npx wrangler d1 execute vibedump-db --file=./schema.sql --remote
```

---

### 3단계: 프론트엔드 빌드 및 Cloudflare Pages 배포

```bash
# 1. 최적화 정적 빌드
npm run build

# 2. Cloudflare Pages에 즉시 배포
npx wrangler pages deploy dist --project-name=vibedump
```

또는 **GitHub 저장소 연동 배포** 시:
1. Cloudflare Dashboard ➔ **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**
2. 빌드 설정:
   * **Framework preset**: `Vite`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
3. **Settings** ➔ **Functions** ➔ **D1 database bindings**:
   * Variable name: `DB`
   * D1 database: `vibedump-db` 선택
4. **Environment variables**:
   * `ADMIN_SECRET`: 본인만의 운영자 비밀번호 지정 (예: `my-secret-admin-pass!`)

---

## 🛡️ Cloudflare D1의 영구 보존 장점
* **데이터가 사라지지 않음**: 서버리스 컨테이너의 임시 파일 시스템과 달리, Cloudflare D1은 글로벌 클라우드 스토리지에 분산 저장되어 영구 보존됩니다.
* **비용 완전 무료**: Cloudflare Pages(무제한 대역폭/요청 무료) + Cloudflare D1(일 500만 건 읽기/10만 건 쓰기 무료)로 비용 $0에 완벽 운영 가능합니다.
* **SQLite 100% 호환**: 기존 로컬에서 쓰던 모든 쿼리(`services`, `tags`, `reviews` 등)가 표준 SQLite 문법이므로 수정 없이 1:1 동작합니다.

---

## 💾 현재 AI Studio 내에서의 임시 백업 & 복원 방법
Cloudflare로 옮기기 전까지 AI Studio 환경에서 데이터를 안전하게 보관하려면:
1. 상단 또는 사이드바의 **`⚙️ 사이트 관리`** ➔ **`운영자 관리 모드`** 로그인
2. **`💾 데이터 백업 & 복원`** 탭 클릭
3. **`전체 데이터 JSON 다운로드`**를 누르면 언제든 1초 만에 전체 등록 데이터를 내 컴퓨터에 저장하고 복원할 수 있습니다.
