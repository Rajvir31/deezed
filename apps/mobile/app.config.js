// SDK 54 – Expo Go uses new architecture by default
module.exports = {
  expo: {
    ...require("./app.json").expo,
    extra: {
      ...require("./app.json").expo.extra,
      eas: {
        projectId: "f63bed8f-b28b-4286-826c-d06190b29c68",
      },
    },
  },
};
