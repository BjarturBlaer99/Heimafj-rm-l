const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { getRoutes } = require('expo-router/build/getRoutes');
const { getReactNavigationConfig } = require('expo-router/build/getReactNavigationConfig');
const { getStateFromPath } = require('expo-router/build/fork/getStateFromPath');
const { GuardContextProvider, useGuardRedirect } = require('expo-router/build/layouts/GuardContext');

const appDir = path.join(__dirname, '../app');
const Stack = Object.assign(() => null, { Protected: () => null, Screen: () => null });

function loadLayout(file, auth) {
  const source = ts.transpileModule(fs.readFileSync(path.join(appDir, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mocks = {
    'expo-router': { Stack },
    'expo-router/react-navigation': { DarkTheme: { colors: {} }, DefaultTheme: { colors: {} }, ThemeProvider: React.Fragment },
    'expo-splash-screen': { setOptions() {} },
    'expo-status-bar': { StatusBar: () => null },
    'react-native': { StyleSheet: { create: (value) => value }, View: 'view', Text: 'text', ActivityIndicator: 'spinner' },
    'react-native-reanimated': {},
    '@/components/brand-mark': { BrandMark: () => null },
    '@/components/app-error-boundary': { AppErrorBoundary: () => null },
    '@/hooks/use-app-theme': { useAppTheme: () => ({ colors: {}, colorScheme: 'light', isDark: false }) },
    '@/providers/auth-provider': { AuthProvider: React.Fragment, useAuth: () => auth },
    '@/providers/feedback-provider': { FeedbackProvider: React.Fragment },
  };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === 'react/jsx-runtime') return require(id);
      throw new Error(`Unexpected layout dependency: ${id}`);
    },
  });
  return module.exports;
}

function navigation(auth) {
  const rootLayout = loadLayout('_layout.tsx', auth);
  // Load real route names/settings without rendering data-fetching native screens.
  const files = fs.readdirSync(appDir, { recursive: true }).filter((file) => file.endsWith('.tsx'));
  const context = (key) => key === './_layout.tsx' ? rootLayout
    : key === './(auth)/_layout.tsx' ? loadLayout('(auth)/_layout.tsx', auth)
    : { default: () => null };
  context.keys = () => files.map((file) => './' + file.replaceAll('\\', '/'));
  const node = getRoutes(context, { platform: 'ios', importMode: 'sync' });
  const config = getReactNavigationConfig(node);

  let element = rootLayout.default();
  // AuthProvider -> FeedbackProvider -> RootNavigator.
  element = element.props.children.props.children.type();
  const stack = React.Children.toArray(element.props.children).find((child) => child.type === Stack);
  const guards = new Map();
  for (const group of React.Children.toArray(stack.props.children)) {
    if (group.type === Stack.Protected && !group.props.guard) {
      for (const screen of React.Children.toArray(group.props.children)) {
        guards.set(screen.props.name, group.props.redirectTo);
      }
    }
  }
  function redirectFor(routeName) {
    let target;
    function Probe() { target = useGuardRedirect(routeName); return null; }
    renderToStaticMarkup(React.createElement(GuardContextProvider, { node, guardedRedirects: guards }, React.createElement(Probe)));
    return target;
  }
  function resolve(href) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const state = getStateFromPath(href, config);
      assert.ok(state, `No route for ${href}`);
      const top = state.routes[state.index ?? state.routes.length - 1];
      assert.notEqual(top.name, '+not-found', `Unmatched route: ${href}`);
      const redirect = redirectFor(top.name);
      if (redirect !== undefined) {
        assert.ok(redirect, `No accessible destination for ${href}`);
        href = typeof redirect === 'string' ? redirect : redirect.pathname;
        continue;
      }
      let leaf = top;
      while (leaf.state) leaf = leaf.state.routes[leaf.state.index ?? leaf.state.routes.length - 1];
      return leaf.name;
    }
    assert.fail(`Redirect loop at ${href}`);
  }
  return resolve;
}

test('signed-out cold launch and private links resolve to sign-in, not a group-only URL', () => {
  const resolve = navigation({ loading: false, session: null, isPasswordRecovery: false });
  assert.equal(resolve('/'), 'sign-in');
  assert.equal(resolve('/transactions'), 'sign-in');
  assert.equal(resolve('/sign-up'), 'sign-up');
});

test('signed-in launch and auth-screen links resolve to the dashboard', () => {
  const resolve = navigation({ loading: false, session: { user: { id: 'sample' } }, isPasswordRecovery: false });
  assert.equal(resolve('/'), 'index');
  assert.equal(resolve('/sign-in'), 'index');
  assert.equal(resolve('/transactions'), 'transactions');
});

test('recovery sessions stay on password reset instead of entering protected finance screens', () => {
  const resolve = navigation({ loading: false, session: { user: { id: 'sample' } }, isPasswordRecovery: true });
  assert.equal(resolve('/'), 'reset-password');
  assert.equal(resolve('/sign-in'), 'reset-password');
  assert.equal(resolve('/transactions'), 'reset-password');
  assert.equal(resolve('/auth-callback'), 'auth-callback');
});
