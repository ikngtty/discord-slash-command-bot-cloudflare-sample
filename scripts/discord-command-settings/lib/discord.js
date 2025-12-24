const API_URL_BASE = "https://discord.com/api/v10";

function getApiUrlApp(appId) {
  return `${API_URL_BASE}/applications/${appId}`;
}

function getApiUrlGuild(appId, guildId) {
  const urlOfApp = getApiUrlApp(appId);
  return `${urlOfApp}/guilds/${guildId}`;
}

function getApiUrlCommands(appId) {
  const urlOfApp = getApiUrlApp(appId);
  return `${urlOfApp}/commands`;
}

function getApiUrlGuildCommands(appId, guildId) {
  const urlOfGuild = getApiUrlGuild(appId, guildId);
  return `${urlOfGuild}/commands`;
}

function getApiUrlCommand(appId, commandId) {
  const urlOfCommands = getApiUrlCommands(appId);
  return `${urlOfCommands}/${commandId}`;
}

function getApiUrlGuildCommand(appId, guildId, commandId) {
  const urlOfCommands = getApiUrlGuildCommands(appId, guildId);
  return `${urlOfCommands}/${commandId}`;
}

export default class Discord {
  constructor(botToken, appId, { guildId = "" } = {}) {
    this.botToken = botToken;
    this.appId = appId;
    this.guildId = guildId;
  }

  async listCommand() {
    const url =
      this.guildId === ""
        ? getApiUrlCommands(this.appId)
        : getApiUrlGuildCommands(this.appId, this.guildId);
    const headers = makeHeaders(this.botToken);

    const resp = await fetch(url, {
      method: "GET",
      headers,
    });
    const respBodyText = await resp.text();
    const respBody = respBodyText === "" ? {} : JSON.parse(respBodyText);

    return { ok: resp.ok, value: respBody };
  }

  async addCommand(command) {
    const url =
      this.guildId === ""
        ? getApiUrlCommands(this.appId)
        : getApiUrlGuildCommands(this.appId, this.guildId);
    const headers = makeHeaders(this.botToken);

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(command),
    });
    const respBodyText = await resp.text();
    const respBody = respBodyText === "" ? {} : JSON.parse(respBodyText);

    return { ok: resp.ok, value: respBody };
  }

  async removeCommand(commandId) {
    const url =
      this.guildId === ""
        ? getApiUrlCommand(this.appId, commandId)
        : getApiUrlGuildCommand(this.appId, this.guildId, commandId);
    const headers = makeHeaders(this.botToken);

    const resp = await fetch(url, {
      method: "DELETE",
      headers,
    });
    const respBodyText = await resp.text();
    const respBody = respBodyText === "" ? {} : JSON.parse(respBodyText);

    return { ok: resp.ok, value: respBody };
  }
}

function makeHeaders(botToken) {
  return {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  };
}
