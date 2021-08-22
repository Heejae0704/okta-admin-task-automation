# Node/Express Okta Admin Task Automaton using Okta Event Hook, Cronjob and CSV files

_Read this in other languages: [English](README.md), [한국어](README.ko.md)_

Okta Event Hook과 API를 이용한 어드민 업무 자동화 예시 샘플 앱입니다. 앱에서 구현한 사례는 Okta에서 특정 그룹애 사용자를 추가할 때, 해당 그룹에 그룹 멤버십 유효기간(사용자 할당 후 1일, 10일 혹은 30일 등)이 있을 경우 멤버십 만료 일자에 자동으로 그룹에서 해당 사용자를 제외하는 구성입니다.

이 구성을 비롯한 일반적인 Okta 어드민 자동화 프로세스에서는 **Okta Event Hook** and **Cronjob** 두 가지가 작업을 시작하는 트리거로 사용될 수 있습니다.

## Okta Event Hook

[Okta 개발자 포털](https://developer.okta.com/docs/concepts/event-hooks/)에 따르면,

> Event Hooks는 Okta에서 외부로 전송되는 콜로, 사용자의 Org에서 지정된 이벤트가 발생할 때마다 송신됩니다. HTTPS REST 콜의 형태로 사용자가 지정한 URL에 발생한 이벤트의 정보가 JSON 객체로 request body에 첨부됩니다. 사용자가 자체적으로 구성한 소프트웨어 시스템에서 프로세스를 개시하는 용도로 보내진 정보를 사용하는 상황을 가정합니다.

단순히 말하면 Okta의 특정 Org에서 어떠한 아이덴티티 관련 이벤트가 일어날 때마다 이를 외부에 있는 이 앱을 비롯한 사용자가 구성한 웹서비스에 알려주는 역할을 한다고 보시면 됩니다. 이 앱에서는 특정 그룹에 사용자가 할당될 때, 어떤 사용자가 어떤 그룹에 할당되었는지에 대한 정보를 받기 위해 사용합니다.

Event Hooks와 통신을 하기 위해서는 Okta가 인터넷을 통해 이 앱의 API 앤드포인트에 접근할 수 있어야 하며, 또한 해당 통신은 HTTPS 즉 TLS로 암호화되어야 합니다. 일반적인 로컬 개발 환경에서 이러한 구성을 해주려면 가장 쉬운 방법은 [ngrok](https://ngrok.com/) 같은 터널링 서비스를 사용하는 것입니다. 다른 방법으로는 아예 Glitch 등의 서비스로 웹에서 Node 환경을 돌리는 것도 가능합니다. ngrok에 대해서는 아래에서 좀 더 설명합니다.

## Node Cron

[node-cron의 깃헙 페이지](https://github.com/node-cron/node-cron)에 따르면,

> node-cron 모듈은 GNU crontab을 기반으로 node.js 환경에서 동작하는 순수한 자바스크립트 기반의 스케줄러입니다. crontab 문법을 이용하여 원하는 시간에 task를 예약할 수 있습니다.

정해진 시간에 주기적으로 수행해야 하는 작업이 있을 때 사용하는 모듈입니다. 이 앱에서는 매일 정해진 시각에 오늘 그룹 멤버십이 만료되는 사용자가 있는지 체크하고, 해당 사용자가 있을 경우 Okta API를 호츌하여 그룹에서 사용자를 제외하는 작업을 수행할 때 사용합니다. (현재 코드에서는 테스트로 1분에 두 번 (0초와 30초) 해당 작업을 수행하도록 설정되어 있습니다.)

## CSV 파일로 데이터 저장

이 샘플 앱에서는 사용자 정보와 그룹 정보를 저장하는 용도로 csv 파일을 사용하고 있습니다. DBMS 사용이 익숙치 않은 경우에도 샘플 앱을 활용할 수 있도록 하기 위한 목적입니다. express 환경에서 DB 연동이 익숙하신 경우에는 `csvReadWrite.js` 파일을 참고하셔서 원하시는 DB에 맞게 수정하여 사용하시면 됩니다.

파일의 읽고 쓰기를 담당하는 모듈인 `csvReadWrite.js`는 `\src` 폴더에 위치하며, 이 샘플 앱에서는 `data` 폴더의 두 가지 csv 파일을 대상으로 동작하도록 되어 있습니다. 파일 I/O 모듈 자체는 두 파일 외에 다른 csv 데이터 작업도 가능하도록 작성되었습니다만, 파일에 보내는 데이터의 형태는 아래와 같은 구성이어야 합니다. `dataKeys`는 각 column의 헤더 array이며 `data`는 각 데이터 행을 구성하는 array입니다.

```javascript
{
    dataKeys: ['userName', 'userId', 'groupName', 'groupId', 'expireOn'],
    data: [
            {
                userName: 'test1@test.com',
                userId: '1234',
                groupName: 'group1',
                groupId: '234gs',
                expireOn: '09/01/2021'
            },
            {
                userName: 'test2@test.com',
                userId: '2324',
                groupName: 'group1',
                groupId: '234gs',
                expireOn: '08/20/2021'
            },
          ]
}
```

### groupsWithDuration.csv

`data` 폴더의 `groupsWithDuration.csv` 파일은 멤버십 유효기간이 있는 그룹들에 대한 정보를 담습니다. `groupName`은 Okta에서 지정한 그룹 이름, 그리고 `duration`은 일 단위의 멤버십 유효기간입니다. (1, 10, 30 등등) 한 가지 팁을 드리자면 Okta Admin UI에서 그룹을 검색할 경우에 \* 기반의 검색이 되지 않으므로, 이름을 `timed-AuditAccess-10days`, `timed-group2-30days` 같은 구조로 만들어주면 나중에 검색하기가 편리합니다.

### membersExpireOn.csv

이 파일은 처음에는 column 이름 외에는 비어 있는 파일입니다. Okta에서 특정 사용자가 그룹에 할당되면 Okta Event Hook이 해당 이벤트를 이 앱에 전송하고, 앱의 자체 로직을 통해 `groupsWithDuration.csv` 파일에 포함된 그룹일 경우 사용자와 그룹 정보, 그리고 멤버십이 만료되는 날짜가 이 파일에 기록되게 됩니다.

### log

자동화 프로세스가 동작한 이후에 사용자 멤버십 제거가 이루어지면 `log` 폴더에 해당 내용이 기록됩니다. (해당 데이터는 `membersExpireOn.csv` 파일에서는 삭제됩니다.)

## Node, Express and other libraries

Node.js는 자바스크립트를 브라우저 외의 환경에서도 작동시켜주는 런타임입니다. express는 심플하지만 강력한 웹 서버를 만들어주는 프레임워크로 Okta Event Hook과의 통신을 위해 사용하였습니다. Node/Express 구성을 사용한 이유는 활발한 커뮤니티 덕분에 다양한 기능들이 라이브러리로 제공되기 때문입니다. `package.json` 파일을 보시면 이 프로젝트를 만들기 위해 어떠한 라이브러리들이 사용되었는지 확인하실 수 있습니다.

## 설치방법

샘플 앱 구동을 위해서는 로컬 환경에 Node.js가 설치되어 있어야 합니다. [여기](https://nodejs.org/en/download)에서 OS에 맞는 Node.js를 다운로드 받으실 수 있습니다. Node.js가 설치된 환경에서 이 프로젝트를 clone하시거나 `.ZIP` 파일로 다운로드 받으셔서 압축을 푸시면 됩니다.

Windows의 경우 command prompt, Mac이라면 terminal에서 로컬에 가져온 샘플 앱의 최상위 폴더에서 아래 명령어를 입력하여 dependencies를 설치합니다.

```
npm install
```

`sample.env`의 이름을 `.env`로 바꾸어 주시고, 파일을 열어서 자신의 환경에 맞는 값을 입력합니다.

- `BASE_URL`은 본인이 관리하는 Okta Org의 주소입니다. (예를 들어, https://acme.okta.com)
- `OKTA_API_TOKEN`은 API 통신을 위한 일종의 암호와 같은 토큰 값으로, Okta 어드민에서 Security > API > Tokens로 가서 생성하실 수 있습니다.
- `SECRET` 은 Okta Event Hook 사용 시 인증을 위한 암호입니다. 임의의 긴 string 값을 넣어주세요. (예를 들어 aerwtjhqir2038ur1h3rj1amksdfaw4jrt)

## 샘플 앱 실행 방법

샘플 앱이 로컬 환경에서도 정상적으로 작동하기 위해서는 위에서 잠깐 언급했던 것처럼 인터넷에 안전하게 노출되어야 합니다. 가장 쉬운 방법으로 [ngrok](https://ngrok.com)을 추천합니다. 링크된 사이트에서 가입 후 무료 버전을 다운로드 받을 수 있습니다. 다운로드 후 홈페이지의 가이드를 따라 설정값을 등록하신 후에 아래 명령어로 ngrok을 구동합니다.

```
./ngrok http 3000
```

ngrok을 구동하는 command prompt/terminal은 그대로 두고, 다른 command/terminal을 열어서 아래의 명령어를 입력하세요.

```
npm start
```

그러면 이제 로컬 환경에서 준비가 거의 끝났습니다. 지금은 `groupsWithDuration.csv` 파일에 데이터가 없기 때문에 node-cron에 의해 분당 두 번씩 자동화 스크립트가 돌기는 하지만 아무런 작업을 하지 않습니다. node-cron의 스케줄 관리는 `src` 폴더의 `cronTask.js`에서 하실 수 있습니다. [여기에서](https://www.adminschoice.com/crontab-quick-reference) 스케줄을 어떻게 설정할 수 있는지 자세한 설명이 나와 있습니다. 만약 테스트를 끝내고 매일 새벽 1시로 구성하고 싶으실 경우, 14번 행의 스케줄을 다음과 같이 바꾸어 주시면 됩니다: `0 1 * * *`

이제 테스트를 위해 Okta에서 몇 가지 설정을 진행해주셔야 합니다.

## Okta에서 그룹 설정

자동화 툴이 체크해야 할 그룹을 Okta에서 만듭니다. 기존에 만들어 둔 그룹을 사용하셔도 무방합니다. 위에서 말씀드린 것처럼 Okta Admin UI에서 그룹을 검색할 경우에 \* 기반의 검색이 되지 않으므로, 이름을 `timed-AuditAccess-10days`, `timed-group2-30days` 같은 구조로 만들어주면 나중에 검색하기가 편리합니다.

해당 그룹에 테스트용 사용자를 한 두 명 정도 넣어줍니다. 나중에 Okta Event Hook을 설정할 때 해도 되지만 지금 해두면 Okta Event Hook 설정 후에 바로 테스트에 들어갈 수 있기 때문에 지금 해두실 것을 권장드립니다.

다시 프로젝트로 돌아와서, 위에서 만든 그룹의 이름을 `groupsWithDuration.csv`에 멤버십 유효기간과 함께 입력하고 저장합니다.

## Okta Event Hook 설정

Okta 어드민에서 Workflow > Event Hooks로 들어가셔서 'Create Event Hook' 버튼을 누릅니다.

- 'Name' 필드에 적당한 이름을 넣어주세요. 저는 `Node - Event Receiver`라고 붙였습니다.
- 'URL'에는 위에서 구동시켜 둔 ngrok 콘솔에서 https로 시작하는 주소에, 끝에 /oktaEvents를 붙여서 넣어줍니다. (예를 들어, `https://abcde1234.ngrok.io/oktaEvents`) 한 가지 주의하셔야 할 사항은, ngrok을 중지하고 다시 실행하면 이 주소가 바뀌므로, 여기로 다시 돌아와서 'URL' 설정을 업데이트해주셔야 한다는 것입니다.
- 'Authentication field'에는 `authorization`이라고 입력해주세요.
- 'Authentication secret'에는 BASE64로 인코딩된 이 샘플 앱의 인증 정보가 Basic 인증 포맷에 맞게 들어갑니다. 먼저 인증정보의 BASE64 값을 구해봅시다. 인터넷에서 온라인으로 BASE64 인코딩을 하는 사이트들을 이용하셔도 됩니다. 위에서 `.env` 파일을 구성하실 때 설정했던 `SECRET` 값을 기억하시나요? 만약 `SECRET`을 `1234`라고 설정하셨다면 BASE64 인코딩에 들어갈 입력값은 `admin:1234`가 됩니다. 인코딩 결과는 `YWRtaW46MTIzNA==` 같은 모양이 나올 겁니다. 그러면 포맷에 맞게 최종적으로 들어가야 하는 값은 `Basic YWRtaW46MTIzNA==`이 됩니다.
- `Subscribe to events`에서는 `User added to group`을 찾아서 선택합니다. (--Group Events-- 아래에 있습니다.)

입력을 마치고 `Save & Continue` 버튼을 누르면 해당 앤드포인트가 본인 소유인지를 확인하는 과정이 나옵니다. 여기까지 잘 따라오셨다면 검증도 무리없이 진행될 것입니다.

이제 Okta Event Hook을 테스트할 수 있습니다. 다음 화면, 또는 Hook 리스트 화면에서 'Actions' 버튼을 누른 후에 나오는 'Preview'를 선택하면 나오는 화면에서, 'Event Type'을 선택하신 다음 그 아래에서 System Log에 보관된 과거 기록 하나를 선택합니다. (위에서 테스트 사용자를 해당 그룹에 할당하셨었다면 그 기록을 선택하실 수 있을 겁니다. 만약 기록이 없다면 빈 JSON이 나오는데, 이러면 필요한 정보를 보낼 수 없으므로 다시 그룹 메뉴로 가셔서 테스트 사용자를 기간 한정 그룹 중 하나에 할당하신 후에 다시 Preview 화면으로 돌어오시기를 권장드립니다.)

JSON이 뜨는 것을 확인하신 후에, 아래쪽 'Deliver Request' 버튼을 클릭하시면 ngrok 콘솔에서는 `POST /oktaEvents 200 OK` 로그가 뜨는 것을, 그리고 localhost 콘솔에서는 좀 더 자세한 로그가 뜨는 것을 보실 수 있습니다.

## 자동화 툴의 동작

위의 작업을 진행하신 후에 (곧바로) `data` 폴더의 `membersExpireOn.csv` 파일을 살펴보시면 새로운 데이터가 들어가 있는 것을 보실 수 있습니다. 자동화 툴이 Okta Event Hook에서 전송된 메시지를 파싱하여, 해당 메시지가 `groupsWithDuration.csv`에 있는 그룹 중 하나에 해당된다는 것을 파악하고, 사용자와 그룹 정보, 그리고 멤버십 만료 일자를 기록한 것입니다.

자 그러면 자동화 툴의 다음 단계가 잘 작동하시는지를 보기 위해, `membersExpireOn.csv` 파일에 올라온 데이터에서 `expireOn` 컬럼의 값을 오늘 날짜로 수정해봅시다. (예를 들어, 08/20/2021) 저장하실 때에는 텍스트 인코딩이 UTF-8, 그리고 csv 포맷으로 저장하고 있는지를 꼭 확인하세요.

이렇게 날짜를 바꾸면 우리의 자동화 툴이 수행하는 다음 작업 (현재는 테스트를 위해 매 분 0초와 30초 마다 수행하는 작업)에서 `membersExpireOn.csv` 파일을 읽고, `expireOn`이 오늘과 오늘 이전 날짜들에 해당하는 데이터가 있는지를 확인합니다. 해당 데이터를 발견한 경우에는 각각에 대해서 Okta Group API를 통해 해당 사용자를 그룹에서 제외하는 작업을 수행합니다. 그리고 작업 내용을 `log` 폴더에 날짜별로 로그를 남깁니다.

축하합니다! 여기까지 정상적으로 작동한다면 로컬 환경에서 이 자동화 툴이 제대로 동작하는 것을 확인하신 것입니다.

## 테스트 이후 실제 사용을 위한 조언

로컬 환경에서 항상 켜져 있는 PC에 이 자동화 툴을 돌린다는 것은 급할 때에는 모르겠으나 그다지 권하고 싶은 방법은 아닙니다. Okta Event Hook과 통신이 요구되는 자동화라면 가급적 클라우드 환경에서 실제 사용을 위한 환경을 설정하실 것을 권장드립니다. AWS에서 인스턴스를 만드는 것도 방법이지만 Heroku 환경이나 Glitch 환경에서 24/7 구동되는 환경을 구성하는 것은 약간의 비용이 들긴 하지만 훨씬 편리한 방법일 수 있습니다. (무료 버전들은 대체로 외부에서 call이 없을 경우 비용 절약을 위해 해당 인스턴스를 잠자기 모드로 보내기 때문에 정상적인 작동이 되지 않을 가능성이 높습니다.)

이 샘플 앱은 다른 자동화 용도로도 사용할 수 있도록 몇 가지 고려가 되어 있습니다:

- csv 파일 읽고 쓰기 모듈은 쓰기에 들어가는 객체의 모양만 지킨다면 다른 데이터도 읽고 쓸 수 있습니다.
- `/oktaEvents` 앤드포인트에 다른 종류의 이벤트를 보내고, 내부 로직으로 다른 종류의 자동화 프로세스를 돌릴 수 있도록 구성하였습니다. (`main.js`의 `switch` 로직)
- node-cron에서 수행되는 프로세스를 함수로 구성했기 때문에 다른 프로세스도 쉽게 추가가 가능합니다.
- Okta API에는 각 API 별로 서로 다른 rate limit이 적용됩니다. rate limit이 넘어가면 Okta가 더 이상 콜을 받지 않을 수 있기 때문에, 이에 대한 간단한 대비를 하였습니다. (`fetchHandlers.js`의 `checkLimitAndDelay` 함수)

## 몇 가지 덧붙일 내용

제가 Okta에 근무하고 있기는 하지만, 이 샘플 앱은 제 개인 프로젝트에 가깝습니다. 몇몇 고객사와 파트너사에서 요청하신 내용에 대해 간단한 가이드를 드리던 코드에서 시작해서, 주말에 짬을 내어서 좀 더 구조를 보강하고 다양한 경우에 대응할 수 있도록 다듬어서 공유하는 내용이기 때문입니다. Okta API 자체에 대한 문서는 잘 되어 있지만 막상 간단한 것이라도 자동화 툴을 만드려고 하면 어디서부터 시작해야 할지 막막한 분들이 참고하셔서 자신의 자동화 툴을 만드는 데 조금이나마 도움이 되었으면 하는 뜻으로 프로젝트를 구성하였습니다. 따라서 이 프로젝트는 공식적인 Okta 제품의 일부가 아니며, 이 샘플 앱을 사용하시면서 발생하는 그 어떠한 이슈에 대해서도 Okta에서 공식적으로 서포트를 제공하지 않습니다.

제가 이 프로젝트를 만든 또 한 가지 이유는, 약간의 프로그래밍이 가능할 경우 Okta의 활용 범위가 무척 넓어질 수 있다는 점을 보여드리고 싶어서입니다. Okta는 SaaS 앱으로 그 자체로도 인증과 계정관리에 대한 다양한 기능들을 제공합니다만, 여기에 약간의 코드를 더하면 Customizing의 가능성이 정말 크게 늘어납니다. Okta Hook을 통해 '언제'를 지정하는 것이 가능하고, Okta API를 통해 거의 모든 작업이 가능하기 때문입니다. 관리자가 스크립트를 통해 Okta에게 언제 무엇이 필요한지만 알려주면 다 알아서 해줄 수 있다는 이야기입니다.

그리고 마지막으로, 이 프로젝트는 사실 실제 고객사와 파트너사에 도움을 드렸던 코드와는 내용이 조금 다릅니다. 제가 의도적으로 Okta Lifecycle Management Workflows에서 제공하는 자동화 템플릿과 거의 비슷한 형태로 바꾸었기 때문입니다. Okta Workflows를 이용하면, 여기서 설명된 자동화를 **코딩 없이, Okta의 환경 내에서** 구현할 수 있습니다!
The current automation setup here is a bit different from my script for the original customer requests. I made it intentionally compatible to one of the Okta Workflows Templates. You can find the Workflows template that will do almost the same, but without coding!

## Okta Workflows

[Okta 공식 홈페이지](https://www.okta.com/platform/workflows/workflows-for-lifecycle-management/)의 Okta Workflows 설명은 아래와 같습니다:

> Okta Workflows는 사용자 deprovisioning 시에 파일 보관, 접속이 없는 고객에 대한 알림 메시지 보내기 등 다양한 비즈니스 프로세스 자동화를 쉽게 구현해 줍니다. Box, Slack, SalesForce, Marketo 등등 다양한 커넥터를 통해 API를 호출하고 아이덴티티 워크플로우를 커스터마이징하세요.

![workflow image](https://www.okta.com/sites/default/files/Workflows-Example.gif)

Okta Workflows는 코드 작성과 관리, 환경 구성 등의 번거로움 없이 맞춤형 로직의 유연함을 누릴 수 있는 Okta의 no-code/low-code 플랫폼입니다. 만약 회사 내에서 이 샘플 앱이 구현하고 있는 것과 같은 맞춤형 프로세스에 대한 니즈가 자주 발생한다면 Okta Workflows의 도입도 꼭 한 번 검토해보시기 바랍니다!
