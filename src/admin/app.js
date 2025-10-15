import contentManagerExtension from './extensions/content-manager/index.js';

const config = {
  locales: ['en'],
};

const bootstrap = (app) => {
  // Register the content manager customization
  app.registerPlugin({
    id: 'dependent-dropdown',
    name: 'dependent-dropdown',
    isReady: true,
  });
  
  // Initialize our customizations
  contentManagerExtension.bootstrap(app);
};

export default {
  config,
  bootstrap,
}; 