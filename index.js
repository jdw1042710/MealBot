const Discord = require("discord.js");
const ytdl = require('ytdl-core');
const { join } = require('path');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, stateChange} = require('@discordjs/voice');
const config = require("./config.json");
const { list } = require("ffmpeg/lib/errors");
//오디오플레이어 서버 1에서 실행중 (서버2에서 실행 시도)
const server_queue = new Map();
//const music = require("./src/music.js");
const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.GUILD_BANS,
        Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
        Discord.Intents.FLAGS.GUILD_WEBHOOKS,
        Discord.Intents.FLAGS.GUILD_INVITES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        Discord.Intents.FLAGS.GUILD_PRESENCES,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Discord.Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
    ]
});


client.once("ready", () =>{
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('틀딱이가 실행', { type: 'PLAYING' })
});

client.on("messageCreate", (message) => {
    if (message.author == client.user) {return;}
    if (!message.content.startsWith(config.PREFIX)){return;}
    arr = message.content.split(" "); //!play 블루밍.mp3
    const cmd = arr[0];
    const args = arr.slice(1);
    console.log(cmd, args);
    switch(cmd){
        case '+play':
            play(message, args);
            break;
        case '+stop':
            stop(message);
            break;
        case '+test':
            test(message, args);
            break;
        case '+playlist':
            playlist(message);
            break;
        default:
            message.reply('유효하지않은 명령어입니다.');
            break;
    }
});

const play = (message, args) =>{
    const voice_channel = message.member.voice.channel;
    let server = server_queue.get(message.guild.id);
    if (!args.length) {return message.reply('URL을 입력하세요');}
    const url = args[0];
    if (!ytdl.validateURL(url)) {return message.reply('올바르지 않는 URL입니다.');}
    if (!voice_channel){return message.reply('먼저 음성채팅방에 입장해주세요.');}

    if(!server){
        const connection = joinVoiceChannel({
            channelId: voice_channel.id,
            guildId: voice_channel.guild.id,
            adapterCreator: voice_channel.guild.voiceAdapterCreator,
        });
        const audioPlayer = createAudioPlayer();
        connection.subscribe(audioPlayer);
        const queue_constructor = {
            voice_channel: voice_channel,
            text_channel: message.channel,
            connection: connection,
            audio_player: audioPlayer,
            songs: []
        }
        queue_constructor.audio_player.addListener("stateChange", (old_state, new_state) => {
            if (!(new_state.status === AudioPlayerStatus.Idle)) {return;}
            const song = getNextSong(message.guild);
            if (!song) {return stop(message);}
            queue_constructor.audio_player.play(createAudioResource(song));
        });
        server_queue.set(message.guild.id, queue_constructor);
        queue_constructor.audio_player.play(createAudioResource(ytdl(url)));
    }else{
        server.songs.push(url);
        return message.reply(`노래 추가됨`);
    }
}

const stop = (message) => {
    const server = server_queue.get(message.guild.id);
    if(!server) {return message.reply('실행중인 봇이 없습니다.');}
    server.connection.destroy();
    server_queue.delete(message.guild.id);
    return message.reply('실행중인 봇을 종료했습니다.');
}

const getNextSong = (guild) => {
    const server = server_queue.get(guild.id);
    if(!server) {return null;}
    const nxt_song = server.songs.shift();
    if(!nxt_song){return null}
    return ytdl(nxt_song);
}

const playlist = (message) =>{
    const server = server_queue.get(message.guild.id);
    if(!server || !server.songs.length) {return message.reply('봇이 노래를 재생하고있지 않습니다.');}
    server.songs.forEach(
        (data) => {console.log(data);}
    );
    
}

const test = (message, args) =>{
    const channel = message.member.voice.channel;
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
    const audioPlayer = createAudioPlayer();
    connection.subscribe(audioPlayer);
    audioPlayer.play(createAudioResource(join(__dirname, args[0])));
}

client.login(config.DISCORD_TOKEN);