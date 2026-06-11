absx = abs(x)
absz = abs(z)


-- Agua
if y < -8 then
  return 12
elseif y < -6 then
  return 13
end

-- Cabeza
if inrange(y,-6,-2) and abs(x) < 5 and z < -7 then
  if y == -4 and z == -10 then
    if abs(x) == 4 then
      return 3
    elseif abs(x) < 2 then
      return 5
    else
      return 4
    end
  else
    return 4
  end
end

-- Branquias
if z == -8 then
  if abs(x) < 7 and (y == -6 or y == -2) then
    return 5
  end
  if inrange(absx,6,7) and (y == -5 or y == -1) then
    return 5
  end
  if absx == 7 and (y == -4 or y == 0)  then
    return 5
  end
  if absx == 5 and y == -3 then
    return 5
  end
  if inrange(absx,2,3) and y == -1 then
    return 5
  end
  if inrange(absx,3,4) and y == 0 then
    return 5
  end
  if absx == 4 and y == 1 then
    return 5
  end
end 

-- Cuerpo
if absx < 4 and z < 3 and y < -1 then
  if x == 0 and (y == -2 or y == -3) then
    return 5
  elseif y < -2 then
    return 4
  end
end

-- Patas
if y == -6 then
  if z == -5 or z == 0 then
    if absx < 8 then
      return 4
    end
  elseif absx == 7 and ((z +1 == -5 or z-1 == -5) or (z +1 == 0 or z-1 == 0)) then
      return 5
  end
end
if absx == 8 and (z == -5 or z == 0) and y == -6 then
      return 5
end

-- Cola
if x == 0 and z > 2 and y < -1 then
  if z < 7 then
    if y == -2 or y == -6 or y == -3 and z == 6 then
      return 5
    else
      return 4
     end
  elseif z < 9 then
    if y == -3 or y == -6 or y == -4 and z == 8 then
      return 5
    elseif y < -3 then
      return 4
    end
  else
    if y == -4 or y == -6 or y == -5 and z == 10 then
      return 5
    elseif y < -4 then
      return 4
    end
  end
end




