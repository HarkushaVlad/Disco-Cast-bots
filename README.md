# Disco Cast Bots

**Disco Cast Bots** is a project that connects your Discord server channels with Telegram channels, automatically forwarding messages from Discord to Telegram. The bots preserve formatting, handle large messages correctly, and support attachments such as images, videos, and more.

## Features

- **Seamless Discord-to-Telegram Bridge**: Messages sent to a chosen Discord channel are forwarded to the connected Telegram channel.
- **Rich Content Support**: Supports text formatting, images, videos, large messages, and other media types.
- **Secure Link Management**: Only Telegram channel owners/admins and Discord server administrators can create and manage connections.
- **Easy Setup and Management**: Intuitive commands in both Discord and Telegram for linking and managing the bridges.

## How It Works

1. **Start the Telegram Bot**

- [Open Disco Cast Telegram Bot](https://t.me/discoCastBot)
- Use the `/createkey` command to generate a unique key for the Telegram channel you wish to link.
- When creating the key, you will also be asked to add a description for it. This can be any name or note to help you identify which channel the key is for (it can be abstract or meaningful for your own reference).
- Copy the generated key.
- Add the Telegram bot to your Telegram channel with permission to post messages.

2. **Connect a Discord Channel**

- [Invite Disco Cast Discord Bot to your Discord server](https://discord.com/oauth2/authorize?client_id=1295764808339292283)
- In your Discord server, use the `/cast` command (all bot interactions are private to you and not visible to other server members).
- Enter the Telegram key you generated earlier to establish the connection.
- Choose the Discord channel you want to link.

> **Note:** From now on, all messages posted in the selected Discord channel will be forwarded to your Telegram channel.

3. **Managing Connections**

- **Telegram Keys**
  - In Telegram, use the `/showkeys` command to view all your active keys (along with their descriptions).
  - You can delete any key from this list to immediately revoke its access.

- **Discord Channels**
  - In Discord, use the `/manage` command.
  - Choose the channel to manage, disconnect, or reconfigure options such as including the source link, channel hashtag, and Disco Cast Bot credits.

## Permissions & Security

- Only the **owner or admins** of a Telegram channel can create and manage keys for that channel.
- Only Discord **server administrators** can link or manage Discord channel connections.
- **Keep your Telegram keys secure** — anyone with the key can link to your Telegram channel.
- If you suspect your Telegram key has been compromised, **delete it immediately** using `/showkeys` in Telegram.

## Example Commands

### Telegram Side

```
/createkey
```

_Create a key for a Telegram channel with a custom description to recognize it later. Add the bot to the channel with post permissions._

```
/showkeys
```

_View all created keys (with their descriptions) and delete ones you no longer need._

### Discord Side

```
/cast
```

_Select a Discord channel and link it with your Telegram key._

```
/manage
```

_Manage or unlink linked Discord channels; configure post options._

## Links

- **Telegram Bot**: [@discoCastBot](https://t.me/discoCastBot)
- **Discord Bot**: [Add to Discord Server](https://discord.com/oauth2/authorize?client_id=1295764808339292283)

---

## License

This project is licensed under the MIT License. See
the [LICENSE](https://github.com/HarkushaVlad/Disco-Cast-bots/blob/main/LICENSE) file for details.
