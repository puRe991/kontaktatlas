import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
export default function GraphPage() {
  return (
    <>
      <h1>Netzwerk</h1>
      <div className="graph">
        <ReactFlow
          nodes={[
            {
              id: "start",
              position: { x: 80, y: 80 },
              data: { label: "KontaktAtlas Netzwerk" },
            },
          ]}
          edges={[]}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </>
  );
}
