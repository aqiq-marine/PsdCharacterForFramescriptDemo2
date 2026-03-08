import { useAnimation, useVariable } from "../src/lib/animation"
import { DrawText } from "../src/lib/animation/effect/draw-text"
import { BEZIER_SMOOTH } from "../src/lib/animation/functions"
import { Clip } from "../src/lib/clip"
import { seconds } from "../src/lib/frame"
import { FillFrame } from "../src/lib/layout/fill-frame"
import { Project, type ProjectSettings } from "../src/lib/project"
import { TimeLine } from "../src/lib/timeline"

import { PsdCharacter, Motion, Voice, MotionSequence, Block, DeclareVariable, DeclareAnimation, createLipSync, createBlink } from "../src/lib/character"


const lipsync1 = {
  "metadata": {
    "duration": 1.93
  },
  "mouthCues": [
    { "start": 0.00, "end": 0.01, "value": "X" },
    { "start": 0.01, "end": 0.06, "value": "A" },
    { "start": 0.06, "end": 0.12, "value": "C" },
    { "start": 0.12, "end": 0.18, "value": "B" },
    { "start": 0.18, "end": 0.27, "value": "A" },
    { "start": 0.27, "end": 0.70, "value": "B" },
    { "start": 0.70, "end": 0.81, "value": "A" },
    { "start": 0.81, "end": 0.96, "value": "B" },
    { "start": 0.96, "end": 1.03, "value": "C" },
    { "start": 1.03, "end": 1.10, "value": "B" },
    { "start": 1.10, "end": 1.17, "value": "G" },
    { "start": 1.17, "end": 1.31, "value": "C" },
    { "start": 1.31, "end": 1.39, "value": "A" },
    { "start": 1.39, "end": 1.68, "value": "B" },
    { "start": 1.68, "end": 1.93, "value": "X" }
  ]
}

const blink1 = {
    "blinkCues": [
        { "start": 0, "end": 0.5, "value": "A" },
        { "start": 0.5, "end": 0.55, "value": "B" },
        { "start": 0.55, "end": 0.60, "value": "C" },
        { "start": 0.60, "end": 0.65, "value": "D" },
        { "start": 0.65, "end": 0.7, "value": "C" },
        { "start": 0.7, "end": 0.75, "value": "B" },
        { "start": 0.75, "end": 10, "value": "A" }
    ]
}


export const PROJECT_SETTINGS: ProjectSettings = {
  name: "framescript-template",
  width: 1920,
  height: 1080,
  fps: 60,
}

const HelloScene = () => {
  const progress = useVariable(0)
  const color = useVariable("#FFFFFF")

  useAnimation(async (context) => {
    await context.parallel([
      context.move(progress).to(1, seconds(3), BEZIER_SMOOTH),
      context.move(color).to("#75a9bd", seconds(3), BEZIER_SMOOTH),
    ])
    await context.sleep(seconds(1))
    await context.move(progress).to(0, seconds(3), BEZIER_SMOOTH)
  }, [])

  return (
    <FillFrame style={{ alignItems: "center", justifyContent: "center" }}>
      <DrawText
        text="Hello, world!"
        fontUrl="../assets/NotoSerifCJKJP-Medium.ttf"
        strokeWidth={2}
        progress={progress}
        strokeColor={color.use()}
        fillColor={color.use()}
      />
    </FillFrame>
  )
}

export const PROJECT = () => {
  const eyeUtilDict = {
      kind: "bool" as const,
      options: {
          Default: "顔パーツ/目/開き",
          Open: "顔パーツ/目/開き",
          HalfOpen: "顔パーツ/目/やや開き",
          HalfClosed: "顔パーツ/目/やや閉じ",
          Closed: "顔パーツ/目/閉じ",
      }
  }
  const mouthUtilDict = {
      kind: "bool" as const,
      options: {
          Default: "顔パーツ/口/あ",
          a: "顔パーツ/口/あ",
          i: "顔パーツ/口/い",
          u: "顔パーツ/口/う",
          e: "顔パーツ/口/え",
          o: "顔パーツ/口/お",
          x: "顔パーツ/口/閉じ",
      }
  }
  const LipSync = createLipSync(mouthUtilDict)
  const Blink = createBlink(eyeUtilDict)
  return (
    <Project>
      <TimeLine>
        <Clip label="Hello">
          <PsdCharacter psd="../assets/フリー.psd">
            <MotionSequence>
                <Block>
                    <Voice voice="../assets/001.wav" volume={0.5}/>
                    <LipSync data={lipsync1} />
                </Block>
                <Voice voice="../assets/002.wav" />
            </MotionSequence>
            <Blink data={blink1} />
          </PsdCharacter>
        </Clip>
      </TimeLine>
    </Project>
  )
}
