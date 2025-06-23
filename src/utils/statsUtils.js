import dayjs from "dayjs";




export const getPostsPerMonth = (posts) => {
    const counts = {};

    posts.forEach((post) => {
        const date = post.createdAt.toDate();
        const month = dayjs(date).format("YYYY-MM")
        console.log(month);

        if (counts[month]) {
            counts[month]++;
        } else {
            counts[month] = 1;
        }


    })
    const result = Object.entries(counts).map(([month, count]) => ({
        month,
        count
    }));

    return result;
};