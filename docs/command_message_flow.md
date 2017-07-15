# Command message flow

Frontend command is to call functions provided by SurfingKeys' frontend, such as `showUsage` / `openOmnibar` etc. Content command is to call functions implemented in content windows, such as `visualUpdate` / `visualClear` etc. The document is about how to refactory the command message flow between windows.

## window types

* top

    The top content window, for most page without frames, the top window is the only content window.

* content

    The content windows including top window and content windows for kinds of frames.

* background

    The background window

* frontend

    The frontend UI of SurfingKeys, created in a shadowRoot by top window.

## current design

![image](https://user-images.githubusercontent.com/288207/28157799-3c31e0ee-67ea-11e7-8ed3-aa291e4ae03e.png)

    sequenceDiagram
        top->>frontend: 1. create

        content->>background: 2. command message

        background->>frontend: 3. forward command message

        frontend->>frontend: 4. do tasks

        opt message.ack === true

            frontend->>background: 5. response
            background->>content: 6. response

        end


## to be improved

![image](https://user-images.githubusercontent.com/288207/28157839-5e86bb42-67ea-11e7-97a0-602135ff3f01.png)

    sequenceDiagram
        top->>frontend: 1. create

        content->>top: 2. command message

        top->>frontend: 3. forward command message

        frontend->>frontend: 4. do tasks

        opt message.ack === true

            frontend->>top: 5. response
            top->>content: 6. response

        end
