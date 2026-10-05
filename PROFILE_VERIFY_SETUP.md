# NIKKE Gear Manager - BlaBlaLink 공개 프로필 동기화

이 기능은 GitHub Pages에서 BlaBlaLink 게임 API를 직접 호출할 수 없는 문제를 Cloudflare Workers 중계로 해결합니다.

## 1. Cloudflare Worker 배포

이 저장소의 `cloudflare-worker.js`를 Worker에 배포합니다.

예:

    npx wrangler login
    npx wrangler deploy

## 2. 서비스용 BlaBlaLink 세션 Secret 설정

사용자의 비밀번호·Cookie·토큰을 사이트에서 입력받지 않습니다.

Worker에는 운영자가 별도로 유지하는 서비스 세션만 Secret으로 저장합니다.

    npx wrangler secret put BLABLALINK_GAME_TOKEN
    npx wrangler secret put BLABLALINK_GAME_OPENID
    npx wrangler secret put BLABLALINK_SERVICE_INTL_OPENID

필요한 경우 서비스 세션을 갱신하고 해당 Secret만 교체합니다.

## 3. 사이트 동기화 방식

사용자는 NIKKE Gear Manager의 **계정 동기화** 버튼을 누른 뒤 공개 BlaBlaLink 프로필 URL만 입력합니다.

Worker가 다음 정보를 조회합니다.

- 공개 프로필 정보
- 공개 NIKKE 로스터
- 캐릭터 상세 정보
- 캐릭터별 장비 기업/티어/레벨

조회 결과는 현재 브라우저의 선택한 계정에 적용되고 기존 LocalStorage 데이터 구조를 그대로 사용합니다.

## 개인정보 및 보안

사용자의 BlaBlaLink 비밀번호, Cookie, `game_token`을 수집하거나 저장하지 않습니다.

사용자가 입력하는 것은 공개 프로필 URL뿐이며, 브라우저는 동기화 요청에 로그인 Cookie를 포함하지 않습니다.

서비스용 BlaBlaLink Secret은 Worker 환경변수에만 저장하고 소스 코드나 GitHub에 넣지 않습니다.

## 기존 Tampermonkey 스크립트

기존 `blablalink-sync*.user.js` 파일은 호환성/백업용으로 저장되어 있으며, 현재 웹사이트의 공개 프로필 URL 동기화에는 필요하지 않습니다.
