module.exports = {
    types: [
        { value: 'feat', name: 'feat:     A new feature' },
        { value: 'fix', name: 'fix:      A bug fix' },
        { value: 'docs', name: 'docs:     Documentation only changes' },
        { value: 'style', name: 'style:    Formatting only (no code change)' },
        { value: 'refactor', name: 'refactor: Code change that neither fixes a bug nor adds a feature' },
        { value: 'perf', name: 'perf:     A code change that improves performance' },
        { value: 'test', name: 'test:     Adding or correcting tests' },
        { value: 'build', name: 'build:    Build system or external dependencies' },
        { value: 'ci', name: 'ci:       CI configuration files and scripts' },
        { value: 'chore', name: 'chore:    Other changes (no src/test changes)' },
        { value: 'revert', name: 'revert:   Revert a previous commit' }
    ],
    scopes: [
        { name: 'project' }, { name: 'config' }, { name: 'deps' }, { name: 'db' },
        { name: 'auth' }, { name: 'user' }, { name: 'match' }, { name: 'chat' },
        { name: 'media' }, { name: 'payment' }, { name: 'notification' }, { name: 'analytics' },
        { name: 'tests' }, { name: 'ci' }, { name: 'docs' },
        { name: 'build' }, { name: 'release' }, { name: 'other' }
    ],
    allowCustomScopes: true,
    allowBreakingChanges: ['feat', 'fix'],
    breaklineChar: '|',
    footerPrefix: 'Part of:',
    messages: {
        type: "Select the type of change:",
        scope: "Select the scope (or press enter to skip):",
        subject: "Write a short description:",
        body: "Provide a longer description (optional). Use Enter for new lines:",
        breaking: "List any BREAKING CHANGES (optional):",
        footer: "Add JIRA issue ID(s), comma-separated (ex: LOOP-123, LOOP-170) or leave empty:"
    },

};
