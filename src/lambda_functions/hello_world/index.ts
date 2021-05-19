

export const hello_world = async(event:any) => {
    return {
        statusCode: 200,
        headers: {
            "content-type":"application/json"
        },
        body: "Hello world!"
    }
}