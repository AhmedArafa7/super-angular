export interface GodotTemplate {
  id: string;
  name: string;
  description: string;
  sceneTree: string;
  scripts: Array<{
    name: string;
    content: string;
    attachedTo: string;
  }>;
}

export const GODOT_TEMPLATES: GodotTemplate[] = [
  {
    id: 'platformer',
    name: 'لعبة منصات',
    description: 'لعبة قفز على المنصات',
    sceneTree: `[gd_scene load_steps=3 format=3]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]

[sub_resource type="RectangleShape2D" id="1"]
size = Vector2(800, 50)

[node name="Root" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="." position=Vector2(100, 300)]
script = ExtResource("1")

[node name="Sprite2D" type="Sprite2D" parent="Player"]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]

[node name="Camera2D" type="Camera2D" parent="Player"]

[node name="Ground" type="StaticBody2D" parent="." position=Vector2(400, 550)]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Ground"]
shape = SubResource("1")

[node name="Platform1" type="StaticBody2D" parent="." position=Vector2(300, 400)]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Platform1"]
shape = SubResource("1")

[node name="Platform2" type="StaticBody2D" parent="." position=Vector2(500, 300)]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Platform2"]
shape = SubResource("1")
`,
    scripts: [
      {
        name: 'player.gd',
        content: `extends CharacterBody2D

const SPEED = 300.0
const JUMP_VELOCITY = -500.0

var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta):
    if not is_on_floor():
        velocity.y += gravity * delta

    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = JUMP_VELOCITY

    var direction = Input.get_axis("ui_left", "ui_right")
    if direction:
        velocity.x = direction * SPEED
    else:
        velocity.x = move_toward(velocity.x, 0, SPEED)

    move_and_slide()
`,
        attachedTo: 'Player'
      }
    ]
  },
  {
    id: 'top-down-rpg',
    name: 'لعبة RPG علوية',
    description: 'لعبة مغامرات من الأعلى',
    sceneTree: `[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]

[node name="Root" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="." position=Vector2(400, 300)]
script = ExtResource("1")

[node name="Sprite2D" type="Sprite2D" parent="Player"]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]

[node name="Camera2D" type="Camera2D" parent="Player"]

[node name="TileMap" type="TileMap" parent="."]
`,
    scripts: [
      {
        name: 'player.gd',
        content: `extends CharacterBody2D

const SPEED = 200.0

func _physics_process(delta):
    var direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    velocity = direction * SPEED
    move_and_slide()
    
    if direction.length() > 0:
        if direction.x > 0:
            rotation_degrees = 0
        elif direction.x < 0:
            rotation_degrees = 180
        elif direction.y > 0:
            rotation_degrees = 90
        elif direction.y < 0:
            rotation_degrees = -90
`,
        attachedTo: 'Player'
      }
    ]
  },
  {
    id: 'shmup',
    name: 'لعبة إطلاق نار',
    description: 'لعبة فضائية',
    sceneTree: `[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]
[ext_resource type="Script" path="res://scripts/bullet.gd" id="2"]
[ext_resource type="Script" path="res://scripts/enemy.gd" id="3"]

[node name="Root" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="." position=Vector2(400, 500)]
script = ExtResource("1")

[node name="Sprite2D" type="Sprite2D" parent="Player"]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]

[node name="BulletContainer" type="Node2D" parent="."]

[node name="EnemyContainer" type="Node2D" parent="."]

[node name="SpawnTimer" type="Timer" parent="."]
wait_time = 2.0
autostart = true
`,
    scripts: [
      {
        name: 'player.gd',
        content: `extends CharacterBody2D

const SPEED = 400.0
var bullet_scene = preload("res://scenes/Bullet.tscn")

func _physics_process(delta):
    var direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    velocity = direction * SPEED
    move_and_slide()
    
    if Input.is_action_just_pressed("ui_accept"):
        shoot()

func shoot():
    var bullet = bullet_scene.instantiate()
    bullet.global_position = global_position
    get_node("/root/Root/BulletContainer").add_child(bullet)
`,
        attachedTo: 'Player'
      },
      {
        name: 'bullet.gd',
        content: `extends Area2D

const SPEED = 600.0

func _physics_process(delta):
    position.y -= SPEED * delta
    
    if position.y < -10:
        queue_free()

func _on_body_entered(body):
    if body.is_in_group("enemy"):
        body.queue_free()
        queue_free()
`,
        attachedTo: 'Bullet'
      },
      {
        name: 'enemy.gd',
        content: `extends CharacterBody2D

const SPEED = 100.0

func _physics_process(delta):
    position.y += SPEED * delta
    
    if position.y > 650:
        queue_free()

func _on_area_entered(area):
    if area.is_in_group("bullet"):
        queue_free()
`,
        attachedTo: 'Enemy'
      }
    ]
  },
  {
    id: 'puzzle',
    name: 'لعبة ألغاز',
    description: 'لعبة تركيب قطع',
    sceneTree: `[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/game_manager.gd" id="1"]

[node name="Root" type="Node2D"]

[node name="GameManager" type="Node" parent="."]
script = ExtResource("1")

[node name="Grid" type="GridContainer" parent="."]
columns = 4

[node name="UI" type="CanvasLayer" parent="."]

[node name="ScoreLabel" type="Label" parent="UI"]
offset_left = 20.0
offset_top = 20.0
offset_right = 200.0
offset_bottom = 50.0
text = "Score: 0"

[node name="Timer" type="Timer" parent="UI"]
wait_time = 60.0
autostart = true
`,
    scripts: [
      {
        name: 'game_manager.gd',
        content: `extends Node

var score = 0
var tiles = []
var first_tile = null
var second_tile = null
var can_flip = true

func _ready():
    create_board()

func create_board():
    var numbers = []
    for i in range(8):
        numbers.append(i)
        numbers.append(i)
    
    numbers.shuffle()
    
    for i in range(16):
        var tile = Button.new()
        tile.custom_minimum_size = Vector2(100, 100)
        tile.text = "?"
        tile.connect("pressed", Callable(self, "on_tile_pressed").bind(i))
        get_node("Grid").add_child(tile)
        tiles.append({"button": tile, "number": numbers[i], "flipped": false})

func on_tile_pressed(index):
    if not can_flip:
        return
    
    var tile = tiles[index]
    if tile["flipped"]:
        return
    
    tile["button"].text = str(tile["number"])
    tile["flipped"] = true
    
    if first_tile == null:
        first_tile = index
    elif second_tile == null:
        second_tile = index
        can_flip = false
        check_match()

func check_match():
    await get_tree().create_timer(1.0).timeout
    
    if tiles[first_tile]["number"] == tiles[second_tile]["number"]:
        score += 10
        get_node("UI/ScoreLabel").text = "Score: " + str(score)
    else:
        tiles[first_tile]["button"].text = "?"
        tiles[first_tile]["flipped"] = false
        tiles[second_tile]["button"].text = "?"
        tiles[second_tile]["flipped"] = false
    
    first_tile = null
    second_tile = null
    can_flip = true
`,
        attachedTo: 'GameManager'
      }
    ]
  }
];
