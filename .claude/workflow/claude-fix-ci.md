name: Claude auto-fix CI
on:
workflow_run:
workflows: ["CI"]
types: [completed]
permissions:
contents: write
pull-requests: write
actions: read
id-token: write
concurrency:
group: claude-fix-${{ github.event.workflow_run.head_branch }}
  cancel-in-progress: true
jobs:
  fix:
    if: >
      github.event.workflow_run.conclusion == 'failure' &&
      github.event.workflow_run.event == 'pull_request' &&
      github.event.workflow_run.actor.login != 'dependabot[bot]' &&
      !startsWith(github.event.workflow_run.head_commit.message, 'fix(ci): claude')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_branch }}
fetch-depth: 0 - uses: pnpm/action-setup@v4 - uses: actions/setup-node@v4
with: { node-version: 20, cache: pnpm } - run: pnpm install --frozen-lockfile - name: Fetch failed logs
env: { GH_TOKEN: "${{ github.token }}" }
        run: gh run view ${{ github.event.workflow_run.id }} --log-failed | tail -n 300 > /tmp/ci-failure.log - uses: anthropics/claude-code-action@v1
with:
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          claude_args: >-
            --max-turns 25
            --allowedTools "Read,Edit,Write,Bash(pnpm:*),Bash(git:*)"
          prompt: |
            Use the ci-fixer agent.
            Branch: ${{ github.event.workflow_run.head_branch }}
Failure log: /tmp/ci-failure.log
