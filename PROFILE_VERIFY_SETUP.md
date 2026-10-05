# NIKKE Gear Manager - BlaBlaLink 프로필 인증 서버

이 기능은 GitHub Pages의 CORS 제한 때문에 Cloudflare Workers를 중계 서버로 사용합니다.

## 1. Cloudflare Worker 배포
Cloudflare 계정에서 Workers를 준비한 뒤 이 저장소의 cloudflare-worker.js와 wrangler.toml을 사용해 배포합니다.

예:

    npx wrangler login
    npx wrangler deploy

## 2. 인증용 비밀키 설정
Worker 코드에 비밀키를 넣지 않고 Cloudflare Secret으로 저장합니다.

예:

    npx wrangler secret put VERIFY_SECRET

충분히 긴 임의 문자열을 입력하세요.

## 3. 사이트의 Worker URL 연결
profile-import-button.js의 PROFILE_VERIFY_API를 실제 Worker URL로 변경합니다.

예:

    const PROFILE_VERIFY_API = 'https://nikke-profile-verify-xxxxxxxx.workers.dev';

배포 후에는 사이트 버튼에서 별도 Tampermonkey 설치 없이 프로필 인증을 사용할 수 있습니다.

## 저장되는 정보
브라우저 LocalStorage에 다음 정보만 추가로 저장합니다.

- 인증된 intl_openid
- 공개 프로필 URL
- 닉네임
- 프로필 이미지 URL
- 인증 완료 여부
- 인증 시각

BlaBlaLink 비밀번호, 쿠키, 로그인 세션은 저장하지 않습니다.