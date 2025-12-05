export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: "https://budget.austinwalling.dev/api",
  },
});


// export default ({ config }) => ({
//   ...config,
//   extra: {
//     ...config.extra,
//     apiUrl: process.env.API_URL,
//   },
// });


