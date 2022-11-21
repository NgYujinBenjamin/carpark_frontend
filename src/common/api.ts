export const performFetchGet = async<T>(path: string, query: string, accessToken?: string): Promise<T> => {
    const headers = new Headers();

    if (accessToken) {
        const bearer = `Bearer ${accessToken}`
        headers.append(`Authorization`, bearer);
    }

    const options = {
        method: `GET`,
        headers,
    }

    const response = await fetch (
        `http://localhost:5000/api${path}${query}`,
        options,
    );

    if (response.ok) {
        try {
            return await response.json();
        } catch (e) {
            throw Error(response.status.toString());
        }
    }
    else throw Error(response.status.toString());
};