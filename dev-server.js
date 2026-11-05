/**
 * @file dev-server.js
 * @description 로컬 개발 및 테스트용 경량 Node.js 서버
 *              - Vercel CLI 로그인 없이도 로컬에서 정적 파일 및 Vercel 서버리스 함수(api/*.js)를 완벽 에뮬레이션
 *              - .env.local 환경 변수 요청마다 핫 리로딩(Hot Reload) 지원
 *              - Node.js 기본 내장 모듈만 사용 (추가 의존성 없음)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const envPath = path.join(__dirname, '.env.local');

// ==========================================================================
// 1. .env.local 환경 변수 로드 함수 (핫 리로딩 지원)
// ==========================================================================
function loadEnvLocal() {
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = val;
        }
      });
    } catch (e) {
      console.error('환경 변수 로드 중 오류:', e.message);
    }
  }
}

// 초기 로드
loadEnvLocal();
console.log('✅ .env.local 환경 변수 로드 완료');

// MIME 타입 매핑 테이블
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ==========================================================================
// 2. HTTP 서버 생성 및 요청 라우팅
// ==========================================================================
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Vercel Serverless 함수 호환 응답 헬퍼 확장 (res.status().json())
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    this.end(JSON.stringify(data));
    return this;
  };

  // ------------------------------------------------------------------------
  // A. API 라우팅 (/api/*)
  // ------------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    // API 호출 시마다 .env.local 최신 변경사항 즉시 반영
    loadEnvLocal();

    const apiName = pathname.replace('/api/', '').split('?')[0];
    const apiFile = path.join(__dirname, 'api', `${apiName}.js`);

    if (fs.existsSync(apiFile)) {
      // POST 바디 파싱
      let bodyData = '';
      req.on('data', chunk => {
        bodyData += chunk;
      });

      req.on('end', async () => {
        try {
          if (bodyData && req.headers['content-type']?.includes('application/json')) {
            req.body = JSON.parse(bodyData);
          } else {
            req.body = bodyData;
          }

          // 캐시를 비우고 핸들러 호출 (핫 리로딩 지원)
          delete require.cache[require.resolve(apiFile)];
          const handler = require(apiFile);
          await handler(req, res);
        } catch (err) {
          console.error(`[API 오류] ${pathname}:`, err);
          res.status(500).json({ success: false, error: err.message });
        }
      });
      return;
    } else {
      return res.status(404).json({ success: false, error: `API 엔드포인트를 찾을 수 없습니다: ${pathname}` });
    }
  }

  // ------------------------------------------------------------------------
  // B. 정적 파일 서빙 (Vanilla HTML/CSS/JS)
  // ------------------------------------------------------------------------
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`서버 내부 오류: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 [냉장고 파먹기 AI] 로컬 개발 서버가 구동되었습니다!`);
  console.log(`👉 접속 주소: http://localhost:${PORT}`);
  console.log(`👉 사용 모델: ${process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free'}\n`);
});
