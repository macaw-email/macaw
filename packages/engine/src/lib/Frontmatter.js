const parser = require("js-yaml");
const { twig } = require("twig");

const optionalByteOrderMark = "\\ufeff?";
const platform = typeof process !== "undefined" ? process.platform : "";
const pattern = `^(${optionalByteOrderMark}(= yaml =|---)$([\\s\\S]*?)^(?:\\2|\\.\\.\\.)\\s*$${
  platform === "win32" ? "\\r?" : ""
}(?:\\n)?)`;
const regex = new RegExp(pattern, "m");

const computeLocation = (match, body) => {
  let line = 1;
  let pos = body.indexOf("\n");
  const offset = match.index + match[0].length;

  while (pos !== -1) {
    if (pos >= offset) {
      return line;
    }
    line++;
    pos = body.indexOf("\n", pos + 1);
  }

  return line;
};

const parse = (string, data) => {
  const match = regex.exec(string);
  if (!match) {
    return {
      attributes: {},
      body: string,
      bodyBegin: 1
    };
  }

  const yaml = match[match.length - 1].replace(/^\s+|\s+$/g, "");
  let parsedYaml = yaml;
  try {
    parsedYaml = twig({ data: yaml }).render(data);
  } catch (e) {
    // revert to plain string
  }
  const attributes = parser.load(parsedYaml) || {};
  const body = string.replace(match[0], "");
  const line = computeLocation(match, string);

  return {
    attributes: attributes,
    body: body,
    bodyBegin: line,
    frontmatter: yaml
  };
};

module.exports = (string, data = {}) => {
  string = string || "";

  const lines = string.split(/(\r?\n)/);
  if (lines[0] && /= yaml =|---/.test(lines[0])) {
    return parse(string, data);
  }

  return {
    attributes: {},
    body: string,
    bodyBegin: 1
  };
};
