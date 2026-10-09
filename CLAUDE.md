# CLAUDE.md

## 프로젝트

Claude Desktop 스케줄러가 매일 약 10시(KST)에 6개 카테고리 브리핑을 `NN_카테고리/YYYY-MM-DD.md`로 커밋하는 개인 아카이브. 모바일 PWA 설계는 [docs/design-mobile-pwa.md](docs/design-mobile-pwa.md).

## 규칙

- 답변과 문서는 한국어로 작성한다.
- 카테고리 폴더(`01_국내경제` ~ `06_말씀`)는 스케줄러 전용이다. 앱 작업에서 수정하지 않는다.
- 앱 코드는 `app/`에, 설계·계획 문서는 `docs/`에 둔다. 새 문서를 추가하면 docs/README.md의 문서 표도 갱신한다.
- push 전에 `git pull --rebase`로 스케줄러 커밋을 먼저 받는다.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
