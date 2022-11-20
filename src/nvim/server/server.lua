-- Part of this file comes from https://github.com/glacambre/firenvim

local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/' -- You will need this for encoding/decoding
-- encoding
function base64_enc(data)
    return ((data:gsub('.', function(x) 
        local r,b='',x:byte()
        for i=8,1,-1 do r=r..(b%2^i-b%2^(i-1)>0 and '1' or '0') end
        return r;
    end)..'0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
        if (#x < 6) then return '' end
        local c=0
        for i=1,6 do c=c+(x:sub(i,i)=='1' and 2^(6-i) or 0) end
        return b:sub(c+1,c+1)
    end)..({ '', '==', '=' })[#data%3+1])
end

-- decoding
function base64_dec(data)
    data = string.gsub(data, '[^'..b..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(b:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if (#x ~= 8) then return '' end
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
            return string.char(c)
    end))
end

-- Returns a 2-characters string the bits of which represent the argument
local function to_16_bits_str(number)
    return string.char(bit.band(bit.rshift(number, 8), 255)) ..
    string.char(bit.band(number, 255))
end

-- Returns a number representing the 2 first characters of the argument string
local function to_16_bits_number(str)
    return bit.lshift(string.byte(str, 1), 8) +
    string.byte(str, 2)
end

-- Returns a 4-characters string the bits of which represent the argument
local function to_32_bits_str(number)
    return string.char(bit.band(bit.rshift(number, 24), 255)) ..
    string.char(bit.band(bit.rshift(number, 16), 255)) ..
    string.char(bit.band(bit.rshift(number, 8), 255)) ..
    string.char(bit.band(number, 255))
end

-- Returns a number representing the 4 first characters of the argument string
local function to_32_bits_number(str)
    return bit.lshift(string.byte(str, 1), 24) +
    bit.lshift(string.byte(str, 2), 16) +
    bit.lshift(string.byte(str, 3), 8) +
    string.byte(str, 4)
end

-- Returns a 4-characters string the bits of which represent the argument
-- Returns incorrect results on numbers larger than 2^32
local function to_64_bits_str(number)
    return string.char(0) .. string.char(0) .. string.char(0) .. string.char(0) ..
    to_32_bits_str(number % 0xFFFFFFFF)
end

-- Returns a number representing the 8 first characters of the argument string
-- Returns incorrect results on numbers larger than 2^48
local function to_64_bits_number(str)
    return bit.lshift(string.byte(str, 2), 48) +
    bit.lshift(string.byte(str, 3), 40) +
    bit.lshift(string.byte(str, 4), 32) +
    bit.lshift(string.byte(str, 5), 24) +
    bit.lshift(string.byte(str, 6), 16) +
    bit.lshift(string.byte(str, 7), 8) +
    string.byte(str, 8)
end

-- Algorithm described in https://tools.ietf.org/html/rfc3174
local function sha1(val)

    -- Mark message end with bit 1 and pad with bit 0, then add message length
    -- Append original message length in bits as a 64bit number
    -- Note: We don't need to bother with 64 bit lengths so we just add 4 to
    -- number of zeros used for padding and append a 32 bit length instead
    local padded_message = val ..
    string.char(128) ..
    string.rep(string.char(0), 64 - ((string.len(val) + 1 + 8) % 64) + 4) ..
    to_32_bits_str(string.len(val) * 8)

    -- Blindly implement method 1 (section 6.1) of the spec without
    -- understanding a single thing
    local H0 = 0x67452301
    local H1 = 0xEFCDAB89
    local H2 = 0x98BADCFE
    local H3 = 0x10325476
    local H4 = 0xC3D2E1F0

    -- For each block
    for M = 0, string.len(padded_message) - 1, 64  do
        local block = string.sub(padded_message, M + 1)
        local words = {}
        -- Initialize 16 first words
        local i = 0
        for W = 1, 64, 4 do
            words[i] = to_32_bits_number(string.sub(
            block,
            W
            ))
            i = i + 1
        end

        -- Initialize the rest
        for t = 16, 79, 1 do
            words[t] = bit.rol(
            bit.bxor(
            words[t - 3],
            words[t - 8],
            words[t - 14],
            words[t - 16]
            ),
            1
            )
        end

        local A = H0
        local B = H1
        local C = H2
        local D = H3
        local E = H4

        -- Compute the hash
        for t = 0, 79, 1 do
            local TEMP
            if t <= 19 then
                TEMP = bit.bor(
                bit.band(B, C),
                bit.band(
                bit.bnot(B),
                D
                )
                ) +
                0x5A827999
            elseif t <= 39 then
                TEMP = bit.bxor(B, C, D) + 0x6ED9EBA1
            elseif t <= 59 then
                TEMP = bit.bor(
                bit.bor(
                bit.band(B, C),
                bit.band(B, D)
                ),
                bit.band(C, D)
                ) +
                0x8F1BBCDC
            elseif t <= 79 then
                TEMP = bit.bxor(B, C, D) + 0xCA62C1D6
            end
            TEMP = (bit.rol(A, 5) + TEMP + E + words[t])
            E = D
            D = C
            C = bit.rol(B, 30)
            B = A
            A = TEMP
        end

        -- Force values to be on 32 bits
        H0 = (H0 + A) % 0x100000000
        H1 = (H1 + B) % 0x100000000
        H2 = (H2 + C) % 0x100000000
        H3 = (H3 + D) % 0x100000000
        H4 = (H4 + E) % 0x100000000
    end

    return to_32_bits_str(H0) ..
    to_32_bits_str(H1) ..
    to_32_bits_str(H2) ..
    to_32_bits_str(H3) ..
    to_32_bits_str(H4)
end

local function utf8_from_byte_array(t)
    local bytearr = {}
    for _, v in ipairs(t) do
        local utf8byte = v < 0 and (0xff + v + 1) or v
        table.insert(bytearr, string.char(utf8byte))
    end
    return table.concat(bytearr)
end

local opcodes = {
    text = 1,
    binary = 2,
    close = 8,
    ping = 9,
    pong = 10,
}

-- The client's handshake is described here: https://tools.ietf.org/html/rfc6455#section-4.2.1
local function parse_headers()
    local headerend = nil
    local headerstring = ""
    -- Accumulate header lines until we have them all
    while headerend == nil do
        headerstring = headerstring .. coroutine.yield(nil, nil, nil)
        headerend = string.find(headerstring, "\r?\n\r?\n")
    end

    -- request is the first line of any HTTP request: 'GET /file HTTP/1.1'
    local request = string.sub(headerstring, 1, string.find(headerstring, "\n"))
    -- rest is any data that might follow the actual HTTP request
    -- (GET+key/values). If I understand the spec correctly, it should be
    -- empty.
    local rest = string.sub(headerstring, headerend + 2)

    local keyvalues = string.sub(headerstring, string.len(request))
    local headerobj = {}
    for key, value in string.gmatch(keyvalues, "([^:]+) *: *([^\r\n]+)\r?\n") do
        headerobj[key] = value
    end
    return request, headerobj, rest
end

local function compute_key(key)
    return base64_enc(sha1(key .. "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
end

-- The server's opening handshake is described here: https://tools.ietf.org/html/rfc6455#section-4.2.2
local function accept_connection(headers)
    return "HTTP/1.1 101 Swithing Protocols\n" ..
    "Connection: Upgrade\r\n" ..
    "Sec-WebSocket-Accept: " .. compute_key(headers["Sec-WebSocket-Key"]) .. "\r\n" ..
    "Upgrade: websocket\r\n" ..
    "\r\n"
end

-- Frames are described here: https://tools.ietf.org/html/rfc6455#section-5.2
local function decode_frame()
    local frame = ""
    local result = {}
    while true do
        local current_byte = 1
        -- We need at least the first two bytes of header in order to
        -- start doing any kind of useful work:
        -- - One for the fin/rsv/opcode fields
        -- - One for the mask + payload length
        while (string.len(frame) < 2) do
            frame = frame .. coroutine.yield(nil)
        end

        result.fin = bit.band(bit.rshift(string.byte(frame, current_byte), 7), 1) == 1
        result.rsv1 = bit.band(bit.rshift(string.byte(frame, current_byte), 6), 1) == 1
        result.rsv2 = bit.band(bit.rshift(string.byte(frame, current_byte), 5), 1) == 1
        result.rsv3 = bit.band(bit.rshift(string.byte(frame, current_byte), 4), 1) == 1
        result.opcode = bit.band(string.byte(frame, current_byte), 15)
        current_byte = current_byte + 1

        result.mask = bit.rshift(string.byte(frame, current_byte), 7) == 1
        result.payload_length = bit.band(string.byte(frame, current_byte), 127)
        current_byte = current_byte + 1

        if result.payload_length == 126 then
            -- Payload length is on the next two bytes, make sure
            -- they're present
            while (string.len(frame) < current_byte + 2) do
                frame = frame .. coroutine.yield(nil)
            end

            result.payload_length = to_16_bits_number(string.sub(frame, current_byte))
            current_byte = current_byte + 2
        elseif result.payload_length == 127 then
            -- Payload length is on the next eight bytes, make sure
            -- they're present
            while (string.len(frame) < current_byte + 8) do
                frame = frame .. coroutine.yield(nil)
            end
            result.payload_length = to_64_bits_number(string.sub(frame, current_byte))
            print("Warning: payload length on 64 bits. Estimated:" .. result.payload_length)
            current_byte = current_byte + 8
        end

        while string.len(frame) < current_byte + result.payload_length do
            frame = frame .. coroutine.yield(nil)
        end

        result.masking_key = string.sub(frame, current_byte, current_byte + 4)
        current_byte = current_byte + 4

        result.payload = ""
        local payload_end = current_byte + result.payload_length - 1
        local j = 1
        for i = current_byte, payload_end do
            result.payload = result.payload .. string.char(bit.bxor(
            string.byte(frame, i),
            string.byte(result.masking_key, j)
            ))
            j = (j % 4) + 1
        end
        current_byte = payload_end + 1
        if result.opcode == opcodes.close then
            log:write("exit decode: " .. frame .. "\n")
            return result
        else
            frame = string.sub(frame, current_byte) .. coroutine.yield(result)
        end
    end
end

-- The format is the same as the client's (
-- https://tools.ietf.org/html/rfc6455#section-5.2 ), except we don't need to
-- mask the data.
local function encode_frame(data)
    -- 130: 10000010
    -- Fin: 1
    -- RSV{1,2,3}: 0
    -- Opcode: 2 (binary frame)
    local header = string.char(130)
    local len
    if string.len(data) < 126 then
        len = string.char(string.len(data))
    elseif string.len(data) < 65536 then
        len = string.char(126) .. to_16_bits_str(string.len(data))
    else
        len = string.char(127) .. to_64_bits_str(string.len(data))
    end
    return  header .. len .. data
end

local function close_frame()
    local frame = encode_frame("")
    return string.char(136) .. string.sub(frame, 2)
end

local function close_server(server)
    vim.loop.close(server)
    -- Work around https://github.com/glacambre/firenvim/issues/49 Note:
    -- important to do this before nvim_command("qall") because it breaks
    -- vim.loop.new_timer():start(1000, 100, (function() os.exit() end))
    -- vim.schedule(function()
        -- vim.api.nvim_command("qall!")
    -- end)
end

local function connection_handler(server, sock, token)
    local pipe = vim.loop.new_pipe(false)

    -- https://neovim.io/doc/user/eval.html#v%3Aservername
    local self_addr = vim.v.servername
    if self_addr == nil then
            self_addr = os.getenv("NVIM_LISTEN_ADDRESS")
    end
    vim.loop.pipe_connect(pipe, self_addr, function(err)
        assert(not err, err)
    end)

    local header_parser = coroutine.create(parse_headers)
    coroutine.resume(header_parser, "")
    local request, headers = nil, nil

    local frame_decoder = coroutine.create(decode_frame)
    coroutine.resume(frame_decoder, nil)
    local decoded_frame = nil
    local current_payload = ""

    return function(err, chunk)
        assert(not err, err)
        if not chunk then
            log:write("close_server 1\n")
            return close_server()
        end
        local _
        if not headers then
            _ , request, headers = coroutine.resume(header_parser, chunk)
            if not request then
                -- Coroutine hasn't parsed the request
                -- because it isn't complete yet
                return
            end
            if not (string.match(request, "^GET /" .. token .. " HTTP/1.1\r\n$")
                and string.match(headers["Connection"] or "", "Upgrade")
                and string.match(headers["Upgrade"] or "", "websocket")) then
                -- Connection didn't give us the right
                -- token, isn't a websocket request or
                -- hasn't been made from a webextension
                -- context: abort.
                sock:close()
                log:write("close_server 2\n")
                close_server(server)
                return
            end
            sock:write(accept_connection(headers))
            pipe:read_start(function(error, v)
                assert(not error, error)
                if v then
                    local status, res = pcall(vim.fn.msgpackparse, {v})
                    -- log:write("\n======out========\n")
                    -- log:write(v)
                    -- log:write("\n=================\n")
                    sock:write(encode_frame(v))
                end
            end)
            return
        end
        _, decoded_frame = coroutine.resume(frame_decoder, chunk)
        while decoded_frame ~= nil do
            if decoded_frame.opcode == opcodes.binary then
                current_payload = current_payload .. decoded_frame.payload
                if decoded_frame.fin then
                    -- log:write("\n=======in========\n")
                    -- log:write(current_payload)
                    -- log:write("\n=================\n")
                    pipe:write(current_payload)
                    current_payload = ""
                end
            elseif decoded_frame.opcode == opcodes.ping then
                -- TODO: implement pong_frame
                -- sock:write(pong_frame(decoded_frame))
                return
            elseif decoded_frame.opcode == opcodes.close and vim.g.server_token == nil then
                sock:write(close_frame(decoded_frame))
                sock:close()
                pipe:close()
                log:write("close_server 3\n")
                -- close_server(server)
                log:write("header_parser: " .. coroutine.status(header_parser) .. "\n")
                log:write("frame_decoder: " .. coroutine.status(frame_decoder) .. "\n")
                return
            end
            _, decoded_frame = coroutine.resume(frame_decoder, "")
        end
    end
end

current_server_port = 0
local function start_server(token, port)
    vim.api.nvim_command("doautocmd GUIEnter")
    local server = vim.loop.new_tcp()
    server:nodelay(true)
    server:bind('127.0.0.1', port)
    server:listen(128, function(err)
        assert(not err, err)
        local sock = vim.loop.new_tcp()
        sock:nodelay(true)
        server:accept(sock)
        sock:read_start(connection_handler(server, sock, token))
    end)
    current_server_port = server:getsockname().port
    return {
        event = "serverStarted",
        port = current_server_port
    }
end

function write_stdout(id, data)
    -- The native messaging protocol expects the message's length
    -- to precede the message. It has to use native endianness. We
    -- assume big endian.
    -- https://developer.chrome.com/docs/apps/nativeMessaging/#native-messaging-host-protocol
    local len = string.len(data)
    local lenstr = string.char(bit.band(len, 255),
    bit.band(bit.rshift(len, 8), 255),
    bit.band(bit.rshift(len, 16), 255),
    bit.band(bit.rshift(len, 24), 255),
    string.byte(data, 1, -1))

    vim.api.nvim_chan_send(id, lenstr)
end

function handle_input(id, data)
    local tab = { string.byte(data[1], 5, -1) }
    data = utf8_from_byte_array(tab)
    log:write("stdin: " .. data .. "\n")
    if string.len(data) == 0 then
        log:write("qall: " .. current_server_port .. "\n")
        vim.api.nvim_command('qall!')
    end
    data = vim.fn.json_decode(data)
    if data['startServer'] and data['password'] then
        vim.g.surfingkeys_standalone = data['standalone']
        return start_server(data['password'], 0)
    elseif data['mode'] then
        vim.fn['SetSurfingkeysStandAlone'](data['mode'])
        return {
            mode = data['mode']
        }
    end
end

home_dir = os.getenv("HOME")
if home_dir == nil then
    home_dir = os.getenv("USERPROFILE")
end
log = io.open(home_dir .. "/.surfingkeys.log", "a")
log:setvbuf("no")

surfingkeys_server_id = 0
if (vim.g ~= nil and vim.g.server_token ~= nil) then
    print("start server...")
    print(start_server(vim.g.server_token, vim.g.server_port))
elseif vim.fn ~= nil then
    surfingkeys_server_id = vim.fn.stdioopen({
        on_stdin = function(id, data, event)
            local status, res = pcall(handle_input, id, data)
            local resp = vim.fn.json_encode({status = status, res = res})
            write_stdout(id, resp)
            log:write("stdout: " .. resp .. "\n")
        end
    })
else
    vim.api.nvim_command('quit')
end

function _G.surfingkeys_notify(event)
    vim.fn.rpcnotify(0, 'surfingkeys:rpc', event)
end

vim.api.nvim_exec([[
function! SurfingkeysNotify(event, ...)
    call rpcnotify(0, 'surfingkeys:rpc', a:event, a:000)
endfunction

function! NewScratch(fn, content, type)
    exec 'tabnew surfingkeys://'.a:fn
    setlocal bufhidden=wipe nobuflisted noswapfile
    tabonly
    let @v = v:lua.base64_dec(a:content)
    normal ggdG"vgP
    nnoremap <buffer> <silent> <Esc> :q<Cr>
    nnoremap <buffer> <silent> <Enter> :w<Cr>
    set nomodified
    if a:type == 'url'
        inoremap <silent> <CR> <Esc>:w<CR>
        set nonumber
        set norelativenumber
    elseif a:type == 'input'
        inoremap <silent> <CR> <Esc>:w<CR>
        set nonumber
        set norelativenumber
    endif
endfunction

function! SetSurfingkeysStandAlone(v)
endfunction

function! SurfingkeysWrite()
    call SurfingkeysNotify("WriteData", getbufline('%', 0, '$'))
    set nomodified
endfunction
au BufWriteCmd surfingkeys://* call SurfingkeysWrite()

nnoremap <silent> <M-i> :call SurfingkeysNotify("Enter")<CR>
nnoremap <silent> <Space>E :call SurfingkeysNotify("Enter", "E")<CR>
nnoremap <silent> <Space>R :call SurfingkeysNotify("Enter", "R")<CR>
" nnoremap <silent> <M-i> :call v:lua.surfingkeys_notify("Enter")<CR>

]], false)
