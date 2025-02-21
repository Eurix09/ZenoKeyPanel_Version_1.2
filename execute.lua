
local userFile = "/storage/emulated/0/Download/UserData.txt"

local function saveCredentials(username, password)
    if username and password then
        local file = io.open(userFile, "w")
        if file then
            file:write(username .. "\n" .. password .. "\n")
            file:close()
            return true
        end
        gg.alert("Error: Could not save user credentials.")
        return false
    end
    return false
end

local function loadCredentials()
    local file = io.open(userFile, "r")
    if file then
        local username = file:read("*l")
        local password = file:read("*l")
        file:close()

        if username and password and username:match("%S") and password:match("%S") then
            return username, password
        end
    end
    return nil, nil
end

local function checkCredentials(username, password)
    if not username or not password then
        gg.alert("Error: Invalid credentials")
        return false
    end

    local url = "https://zenoontoppanel.onrender.com/execute?username=" .. username .. "&apiKey=" .. password .. "&linkClicked=true"
    local response = gg.makeRequest(url)

    if not response then
        gg.alert("Error: Network connection failed")
        return false
    end

    if not response.content then
        gg.alert("Error: Empty response from server")
        return false
    end

    local responseData = gg.parseJson(response.content)
    if not responseData then
        gg.alert("Error: Invalid server response format")
        return false
    end

    if responseData.error then
        gg.alert(responseData.error)
        os.remove(userFile)
        return false
    end

    if responseData.message then
        local details = responseData.message
        if responseData.type then
            details = details .. "\nDevice Type: " .. responseData.type
        end
        if responseData.zipCode then
            details = details .. "\nZIP Code: " .. responseData.zipCode
        end
        gg.alert(details)
        return true
    end

    gg.alert("Invalid credentials! Please contact @ZenoOnTop for a new key.")
    os.remove(userFile)
    return false
end

-- Main execution starts here
local username, password = loadCredentials()

if not username or not password then
    local infoResponse = gg.makeRequest("https://zenoontoppanel.onrender.com/execute/info")
    
    if not infoResponse or not infoResponse.content then
        gg.alert("Error: Server connection failed. Check your internet connection.")
        os.exit()
    end

    local infoData = gg.parseJson(infoResponse.content)
    if not infoData or not infoData[1] or not infoData[1].zip then
        gg.alert("Error: Could not retrieve ZIP code")
        os.exit()
    end

    local zipCode = infoData[1].zip

    local deviceChoice = gg.choice({
        "1Key device",
        "All device",
        "Exit"
    }, nil, "Select your device type")

    if not deviceChoice then
        gg.alert("Operation cancelled")
        os.exit()
    end

    if deviceChoice == 3 then
        gg.alert("Script cancelled")
        os.exit()
    end

    if deviceChoice == 1 then
        local codeChoice = gg.choice({
            "Copy my ZIP Code: " .. zipCode,
            "Login",
            "Cancel"
        }, nil, "Your ZIP code verification - 1Key device")

        if not codeChoice then
            gg.alert("Operation cancelled")
            os.exit()
        end

        if codeChoice == 1 then
            gg.copyText(zipCode)
            gg.toast("ZIP Code copied! Contact @ZenoOnTop")
            os.exit()
        end

        if codeChoice == 3 then
            gg.alert("Script cancelled")
            os.exit()
        end
    end

    local credentials = gg.prompt(
        {"Username:", "Password:"},
        {[1] = "", [2] = ""},
        {"text", "text"}
    )

    if not credentials then
        gg.alert("Operation cancelled")
        os.exit()
    end

    username, password = credentials[1], credentials[2]
    
    if not username:match("%S") or not password:match("%S") then
        gg.alert("Username and password cannot be empty!")
        os.exit()
    end
    
    if not saveCredentials(username, password) then
        gg.alert("Failed to save credentials")
        os.exit()
    end
end

if not checkCredentials(username, password) then
    os.exit()
end

gg.alert("Welcome, VIP User!")
