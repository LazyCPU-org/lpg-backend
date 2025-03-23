import { createApp } from "./app";

const app = createApp();
const port: number = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/docs`
  );
});
