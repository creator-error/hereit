import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ViewerTools } from "./ViewerTools";

const meta = {
  title: "features/spark-viewer/ViewerTools",
  component: ViewerTools,
} satisfies Meta<typeof ViewerTools>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    className: "",
    setMovementControl: (key, active) => {
      console.log(`setMovementControl: ${key} ${active}`);
    },
    endMovementControl: (key) => {
      console.log(`endMovementControl: ${key}`);
    },
    setSoundEnabled: (enabled) => {
      console.log(`setSoundEnabled: ${enabled}`);
    },
  },
};
