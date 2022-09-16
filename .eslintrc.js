{
  "parser": "babel-eslint",
    "extends": [
      "standard"
    ],
      "env": {
    "es6": true,
      "browser": true,
        "node": true
  },
  "rules": {
    "no-console": 0,
      "import/extensions": 0,
        "camelcase": 0,
          "semi": [2, "never"],
            "no-tabs": [2, { "allowIndentationTabs": true }]
  },
  "plugins": [
    "babel",
    "flow-vars"
  ]
}
